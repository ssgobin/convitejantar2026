import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Loader } from 'lucide-react';
import FirebaseService, { HistoricoService } from '../services/firebase';

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;
  
  return true;
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj[i]) * pesos1[i];
  }
  let resto = soma % 11;
  let digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpj[12])) return false;
  
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj[i]) * pesos2[i];
  }
  resto = soma % 11;
  let digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(cnpj[13])) return false;
  
  return true;
}

function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

function formatarDocumento(valor, tipo) {
  if (tipo === 'CPF') {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  } else {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
    if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
    if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
  }
}

export default function Cadastro({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    tipoDocumento: 'CPF',
    empresa: '',
    telefone: '',
    email: '',
    mesa: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'documento') {
      setFormData(prev => ({ ...prev, documento: formatarDocumento(value, formData.tipoDocumento) }));
    } else if (name === 'telefone') {
      setFormData(prev => ({ ...prev, telefone: formatarTelefone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTipoDocumentoChange = (e) => {
    const tipo = e.target.value;
    setFormData(prev => ({
      ...prev,
      tipoDocumento: tipo,
      documento: '',
      empresa: tipo === 'CNPJ' ? prev.empresa : ''
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (!formData.documento.trim()) {
      newErrors.documento = 'Documento é obrigatório';
    } else if (formData.tipoDocumento === 'CPF' && !validarCPF(formData.documento)) {
      newErrors.documento = 'CPF inválido';
    } else if (formData.tipoDocumento === 'CNPJ' && !validarCNPJ(formData.documento)) {
      newErrors.documento = 'CNPJ inválido';
    }
    
    if (formData.tipoDocumento === 'CNPJ' && !formData.empresa.trim()) {
      newErrors.empresa = 'Nome da empresa é obrigatório para CNPJ';
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validarEmail(formData.email)) {
      newErrors.email = 'Email inválido';
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
        documento: formData.documento.replace(/\D/g, ''),
        tipoDocumento: formData.tipoDocumento,
        empresa: formData.tipoDocumento === 'CNPJ' ? formData.empresa.trim() : '',
        telefone: formData.telefone,
        email: formData.email.trim().toLowerCase(),
        mesa: formData.mesa.trim(),
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
        documento: '',
        tipoDocumento: 'CPF',
        empresa: '',
        telefone: '',
        email: '',
        mesa: ''
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
              <label className="form-label">Tipo de Documento *</label>
              <select
                name="tipoDocumento"
                className="form-select"
                value={formData.tipoDocumento}
                onChange={handleTipoDocumentoChange}
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">{formData.tipoDocumento === 'CPF' ? 'CPF *' : 'CNPJ *'}</label>
              <input
                type="text"
                name="documento"
                className="form-input"
                placeholder={formData.tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000/0001-00'}
                value={formData.documento}
                onChange={handleChange}
                maxLength={formData.tipoDocumento === 'CPF' ? 14 : 18}
              />
              {errors.documento && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.documento}</span>}
            </div>
          </div>
          
          {formData.tipoDocumento === 'CNPJ' && (
            <div className="form-group">
              <label className="form-label">Nome da Empresa *</label>
              <input
                type="text"
                name="empresa"
                className="form-input"
                placeholder="Digite o nome da empresa"
                value={formData.empresa}
                onChange={handleChange}
              />
              {errors.empresa && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.empresa}</span>}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Celular / WhatsApp *</label>
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
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.email}</span>}
            </div>
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