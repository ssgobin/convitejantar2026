import { useState } from 'react';
import { Lock, LogIn, Loader, Eye, EyeOff } from 'lucide-react';
import { AuthService, HistoricoService } from '../services/firebase';

export default function Login({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    
    setLoading(true);
    
    try {
      const user = await AuthService.login(email, password);
      await HistoricoService.adicionarAcesso('login', `Usuário: ${email}`);
      onLogin(user);
      showToast('Login realizado com sucesso!', 'success');
    } catch (err) {
      setError(err.message || 'Credenciais inválidas');
      showToast('Credenciais inválidas', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/Logo.png" 
            alt="Logo ACIA" 
            style={{ 
              width: '100px',
              marginBottom: '1rem'
            }} 
          />
          <h2 className="card-title" style={{ justifyContent: 'center' }}>Login Administrativo</h2>
          <p style={{ color: 'var(--gray-400)', marginTop: '0.5rem' }}>Acesso restrito</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@acia2026.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-400)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '8px', 
              color: 'var(--error)',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? (
              <>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', width: '20px', height: '20px' }} />
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Entrar
              </>
            )}
          </button>
        </form>
        
        <p style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem', 
          color: 'var(--gray-500)', 
          fontSize: '0.75rem' 
        }}>
          Credenciais padrão: admin@acia2026.com / ACIA2026Admin!
        </p>
      </div>
    </div>
  );
}