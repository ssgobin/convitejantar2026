import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Loader } from 'lucide-react';
import FirebaseService, { HistoricoService } from '../services/firebase';

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

export default function Cadastro({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    mesa: '',
    cargo: 'Convidado'
  });

  const cargos = ['Convidado', 'Autoridades', 'Patrocinadores', 'Entidades'];
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      setFormData(prev => ({ ...prev, telefone: formatarTelefone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }
    
    if (!formData.mesa.trim()) {
      newErrors.mesa = 'Número da mesa é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      showToast('Por favor, corrija os erros no formulário', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const qrCodeId = FirebaseService.gerarQRCodeId();
      
      await FirebaseService.adicionarConvidado({
        nome: formData.nome.trim(),
        telefone: formData.telefone,
        mesa: formData.mesa.trim(),
        cargo: formData.cargo,
        qrCodeId
      });
      
      await HistoricoService.adicionarAcesso('cadastro', `${formData.nome.trim()} - Mesa ${formData.mesa.trim()}`);
      showToast('Convidado cadastrado com sucesso!', 'success');
      
      const guests = await FirebaseService.buscarTodosConvidados();
      const newGuest = guests.find(g => g.qrCodeId === qrCodeId);
      
      if (newGuest) {
        navigate(`/convite/${newGuest.id}`);
      }
      
      setFormData({
        nome: '',
        telefone: '',
        mesa: '',
        cargo: 'Convidado'
      });
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      showToast('Erro ao cadastrar convidado', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Cadastro de Convidado</h1>
      <p className="page-subtitle">Preencha os dados abaixo para gerar o convite</p>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <UserPlus size={24} />
            Novo Convidado
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                name="nome"
                className="form-input"
                placeholder="Digite o nome completo"
                value={formData.nome}
                onChange={handleChange}
              />
              {errors.nome && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.nome}</span>}
            </div>
</div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone *</label>
              <input
                type="tel"
                name="telefone"
                className="form-input"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={handleChange}
                maxLength={15}
              />
              {errors.telefone && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.telefone}</span>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Número da Mesa *</label>
              <input
                type="text"
                name="mesa"
                className="form-input"
                placeholder="Digite o número da mesa"
                value={formData.mesa}
                onChange={handleChange}
                style={{ maxWidth: '200px' }}
              />
              {errors.mesa && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.mesa}</span>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <select
                name="cargo"
                className="form-input"
                value={formData.cargo}
                onChange={handleChange}
                style={{ maxWidth: '200px' }}
              >
                {cargos.map(cargo => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader size={20} className="spinner" style={{ animation: 'spin 1s linear infinite', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', width: '20px', height: '20px' }} />
                Cadastrando...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Cadastrar Convidado
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}