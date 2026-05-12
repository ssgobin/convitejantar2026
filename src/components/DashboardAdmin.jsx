import { useState, useEffect, useCallback } from 'react';
import { 
  Users, CheckCircle, Clock, LayoutGrid, 
  Search, Edit, Trash2, QrCode, Download,
  FileSpreadsheet, FileText, X, RefreshCw, Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import FirebaseService, { HistoricoService, ConfigService } from '../services/firebase';
import ConfigAdmin from './ConfigAdmin';
import ConfirmationModal from './ConfirmationModal';

function formatarDocumento(doc, tipo) {
  if (tipo === 'CPF') {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}

export default function DashboardAdmin({ showToast }) {
  const [convidados, setConvidados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, confirmados: 0, presentes: 0, pendentes: 0, mesasOcupadas: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMesa, setFilterMesa] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [mesas, setMesas] = useState([]);
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: () => {} });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const guests = await FirebaseService.buscarTodosConvidados();
      const statistics = await FirebaseService.buscarEstatisticas();
      const allMesas = await FirebaseService.buscarMesas();
      
      setConvidados(guests);
      setStats(statistics);
      setMesas(allMesas);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredConvidados = convidados.filter(guest => {
    const matchesSearch = !searchTerm || 
      guest.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.documento.includes(searchTerm) ||
      (guest.empresa && guest.empresa.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesMesa = !filterMesa || guest.mesa === filterMesa;
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'present' && guest.checkedIn) ||
      (filterStatus === 'pending' && !guest.checkedIn);
    
    return matchesSearch && matchesMesa && matchesStatus;
  });

  const openEditModal = (guest) => {
    setFormData({ ...guest });
    setEditModal(guest.id);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      await FirebaseService.atualizarConvidado(editModal, {
        nome: formData.nome,
        documento: formData.documento.replace(/\D/g, ''),
        empresa: formData.empresa,
        telefone: formData.telefone,
        email: formData.email,
        mesa: formData.mesa
      });
      
      await HistoricoService.adicionarAcesso('edicao', `Convidado: ${formData.nome}`);
      showToast('Convidado atualizado com sucesso!', 'success');
      setEditModal(null);
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      showToast('Erro ao atualizar convidado', 'error');
    }
  };

  const deleteGuest = async (id, nome) => {
    setConfirmModal({
      open: true,
      title: 'Excluir Convidado',
      message: `Tem certeza que deseja excluir ${nome}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await FirebaseService.excluirConvidado(id);
          await HistoricoService.adicionarAcesso('exclusao', `Convidado: ${nome}`);
          showToast('Convidado excluído com sucesso!', 'success');
          loadData();
        } catch (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir convidado', 'error');
        }
      }
    });
  };

  const regenerateQRCode = async (id) => {
    try {
      const guest = convidados.find(g => g.id === id);
      const newQRCode = FirebaseService.gerarQRCodeId();
      await FirebaseService.atualizarConvidado(id, { qrCodeId: newQRCode });
      await HistoricoService.adicionarAcesso('regeneracao', `Convidado: ${guest?.nome}`);
      showToast('QR Code regerado com sucesso!', 'success');
      loadData();
    } catch (error) {
      console.error('Erro ao regenerar QR:', error);
      showToast('Erro ao regenerar QR Code', 'error');
    }
  };

  const exportExcel = () => {
    const data = filteredConvidados.map(guest => ({
      Nome: guest.nome,
      Documento: formatarDocumento(guest.documento, guest.tipoDocumento),
      Empresa: guest.empresa || '-',
      Telefone: guest.telefone,
      Email: guest.email,
      Mesa: guest.mesa,
      Status: guest.checkedIn ? 'Presente' : 'Pendente',
      'Check-in': guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleString('pt-BR') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Convidados');
    XLSX.writeFile(wb, 'convidados-acia-2026.xlsx');
    showToast('Excel exportado com sucesso!', 'success');
  };

  const exportCSV = () => {
    const data = filteredConvidados.map(guest => ({
      nome: guest.nome,
      documento: formatarDocumento(guest.documento, guest.tipoDocumento),
      empresa: guest.empresa || '',
      telefone: guest.telefone,
      email: guest.email,
      mesa: guest.mesa,
      status: guest.checkedIn ? 'presente' : 'pendente',
      checkInAt: guest.checkedInAt || ''
    }));

    const csv = [
      Object.keys(data[0]).join(';'),
      ...data.map(row => Object.values(row).join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'convidados-acia-2026.csv';
    link.click();
    showToast('CSV exportado com sucesso!', 'success');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Jantar dos Empresários ACIA 2026', 14, 20);
    doc.setFontSize(12);
    doc.text(`Lista de Convidados - ${filteredConvidados.length} registros`, 14, 30);
    
    const tableData = filteredConvidados.map(guest => [
      guest.nome,
      formatarDocumento(guest.documento, guest.tipoDocumento),
      guest.empresa || '-',
      guest.mesa,
      guest.checkedIn ? 'Presente' : 'Pendente'
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Nome', 'Documento', 'Empresa', 'Mesa', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [201, 162, 39] }
    });

    doc.save('convidados-acia-2026.pdf');
    showToast('PDF exportado com sucesso!', 'success');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Dashboard Administrativo</h1>
      <p className="page-subtitle">Gerencie os convidados do evento</p>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">
            <Users size={24} />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total de Convidados</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-value">{stats.confirmados}</div>
          <div className="stat-label">Confirmados</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon info">
            <Clock size={24} />
          </div>
          <div className="stat-value">{stats.presentes}</div>
          <div className="stat-label">Presentes</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={24} />
          </div>
          <div className="stat-value">{stats.pendentes}</div>
          <div className="stat-label">Pendentes</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon gold">
            <LayoutGrid size={24} />
          </div>
          <div className="stat-value">{stats.mesasOcupadas}</div>
          <div className="stat-label">Mesas Ocupadas</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Users size={24} />
            Lista de Convidados
          </h2>
          <div className="export-buttons">
            <button className="btn btn-secondary btn-sm" onClick={exportExcel}>
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={16} />
              CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportPDF}>
              <FileText size={16} />
              PDF
            </button>
          </div>
        </div>
        
        <div className="filters">
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="filter-select"
            value={filterMesa}
            onChange={(e) => setFilterMesa(e.target.value)}
          >
            <option value="">Todas as mesas</option>
            {mesas.map(mesa => (
              <option key={mesa} value={mesa}>Mesa {mesa}</option>
            ))}
          </select>
          
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="present">Presentes</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
        
        {filteredConvidados.length === 0 ? (
          <div className="empty-state">
            <Users size={64} />
            <h3>Nenhum convidado encontrado</h3>
            <p>Não há convidados que correspondam aos filtros selecionados.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Empresa</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Mesa</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredConvidados.map(guest => (
                  <tr key={guest.id}>
                    <td>{guest.nome}</td>
                    <td>{formatarDocumento(guest.documento, guest.tipoDocumento)}</td>
                    <td>{guest.empresa || '-'}</td>
                    <td>{guest.telefone}</td>
                    <td>{guest.email}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: '600' }}>{guest.mesa}</td>
                    <td>
                      <span className={`status-badge ${guest.checkedIn ? 'present' : 'pending'}`}>
                        {guest.checkedIn ? 'Presente' : 'Pendente'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="icon-btn"
                          title="Editar"
                          onClick={() => openEditModal(guest)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Regerar QR Code"
                          onClick={() => regenerateQRCode(guest.id)}
                        >
                          <QrCode size={16} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Excluir"
                          onClick={() => deleteGuest(guest.id, guest.nome)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div style={{ marginTop: '1rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
          Mostrando {filteredConvidados.length} de {convidados.length} convidados
        </div>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <button 
            className={`btn ${showConfig ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={18} />
            {showConfig ? 'Fechar Configurações' : 'Configurações do Sistema'}
          </button>
        </div>
      </div>
      
      {showConfig && <ConfigAdmin showToast={showToast} />}
      
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Convidado</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                type="text"
                name="nome"
                className="form-input"
                value={formData.nome || ''}
                onChange={handleEditChange}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  type="text"
                  name="telefone"
                  className="form-input"
                  value={formData.telefone || ''}
                  onChange={handleEditChange}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Mesa *</label>
                <input
                  type="text"
                  name="mesa"
                  className="form-input"
                  value={formData.mesa || ''}
                  onChange={handleEditChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email || ''}
                onChange={handleEditChange}
              />
            </div>
            
            {formData.tipoDocumento === 'CNPJ' && (
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  className="form-input"
                  value={formData.empresa || ''}
                  onChange={handleEditChange}
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveEdit}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}