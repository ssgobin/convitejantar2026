import { useState, useEffect } from 'react';
import { Settings, Upload, Image, History, Trash2, RefreshCw } from 'lucide-react';
import { ConfigService, HistoricoService } from '../services/firebase';
import ConfirmationModal from './ConfirmationModal';

export default function ConfigAdmin({ showToast }) {
  const [config, setConfig] = useState(null);
  const [modeloFile, setModeloFile] = useState(null);
  const [modeloPreview, setModeloPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [activeTab, setActiveTab] = useState('modelo');
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    loadConfig();
    loadHistorico();
  }, []);

  const loadConfig = async () => {
    const cfg = await ConfigService.getConfig();
    setConfig(cfg);
    if (cfg.modeloConviteUrl) {
      setModeloPreview(cfg.modeloConviteUrl);
    }
  };

  const loadHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const logs = await HistoricoService.buscarHistorico(50);
      setHistorico(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match(/image.*/)) {
        showToast('Selecione uma imagem (PNG, JPG)', 'error');
        return;
      }
      setModeloFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setModeloPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadModelo = async () => {
    if (!modeloFile) return;
    
    setUploading(true);
    try {
      const url = await ConfigService.uploadModelo(modeloFile);
      await ConfigService.updateConfig({ modeloConviteUrl: url });
      showToast('Modelo atualizado com sucesso!', 'success');
      await loadConfig();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showToast('Erro ao fazer upload do modelo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeModelo = () => {
    setConfirmModal({
      open: true,
      title: 'Remover Modelo',
      message: 'Tem certeza que deseja remover o modelo de convite? O sistema voltará a usar o layout padrão.',
      onConfirm: async () => {
        try {
          await ConfigService.updateConfig({ modeloConviteUrl: null });
          setModeloPreview(null);
          setModeloFile(null);
          showToast('Modelo removido', 'success');
        } catch (error) {
          showToast('Erro ao remover modelo', 'error');
        }
      }
    });
  };

  const formatarData = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getAcaoLabel = (acao) => {
    const labels = {
      'checkin': 'Check-in realizado',
      'cadastro': 'Novo convidado cadastrado',
      'edicao': 'Dados editados',
      'exclusao': 'Convidado excluído',
      'regeneracao': 'QR Code regerado',
      'login': 'Acesso administrativo'
    };
    return labels[acao] || acao;
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="card-header">
        <h2 className="card-title">
          <Settings size={24} />
          Configurações do Sistema
        </h2>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          className={`btn ${activeTab === 'modelo' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('modelo')}
        >
          <Image size={18} />
          Modelo de Convite
        </button>
        <button 
          className={`btn ${activeTab === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('historico'); loadHistorico(); }}
        >
          <History size={18} />
          Histórico de Acessos
        </button>
      </div>
      
      {activeTab === 'modelo' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--gray-400)', marginBottom: '1rem' }}>
              Faça upload de uma imagem PNG para usar como modelo de convite. 
              O sistema irá sobrepor o nome, mesa e QR Code sobre a imagem.
            </p>
            
            {modeloPreview && (
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ marginBottom: '0.75rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  Preview do modelo atual:
                </p>
                <img 
                  src={modeloPreview} 
                  alt="Modelo de convite" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    border: '1px solid var(--gold)'
                  }} 
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">
                <Upload size={16} style={{ marginRight: '0.5rem' }} />
                Selecionar novo modelo (PNG)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="form-input"
                style={{ padding: '0.5rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={uploadModelo}
                disabled={!modeloFile || uploading}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Salvar Modelo
                  </>
                )}
              </button>
              
              {modeloPreview && (
                <button className="btn btn-danger" onClick={removeModelo}>
                  <Trash2 size={18} />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'historico' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--white)', fontSize: '1.125rem' }}>Últimas atividades</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadHistorico}>
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
          
          {loadingHistorico ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : historico.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <History size={48} />
              <p>Nenhum registro de acesso</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Ação</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {formatarData(item.timestamp)}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(201, 162, 39, 0.15)',
                          color: 'var(--gold)',
                          fontSize: '0.8125rem'
                        }}>
                          {getAcaoLabel(item.acao)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                        {item.detalhes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      <ConfirmationModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remover"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}