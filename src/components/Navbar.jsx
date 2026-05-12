import { NavLink } from 'react-router-dom';
import { Users, QrCode, LayoutDashboard, UserPlus, Moon, Sun, LogOut, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import FirebaseService from '../services/firebase';

export default function Navbar({ user, onLogout, darkMode, onToggleDarkMode }) {
  const [presentesTempoReal, setPresentesTempoReal] = useState(0);

  useEffect(() => {
    const unsubscribe = FirebaseService.onSnapshotEstatisticas((stats) => {
      setPresentesTempoReal(stats.presentes);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img 
            src="/Logo.png" 
            alt="Logo ACIA" 
            style={{ height: '40px' }} 
          />
        </div>
        <div className="navbar-links">
          <NavLink to="/cadastro" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UserPlus size={18} />
            <span>Cadastro</span>
          </NavLink>
          <NavLink to="/checkin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <QrCode size={18} />
            <span>Check-in</span>
          </NavLink>
          {user && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Admin</span>
            </NavLink>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: '8px',
            marginLeft: '0.5rem'
          }}>
            <Radio size={14} style={{ color: 'var(--success)', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.875rem' }}>
              {presentesTempoReal}
            </span>
          </div>
          
          {user && (
            <button className="icon-btn" onClick={onLogout} title="Sair" style={{ marginLeft: '0.5rem' }}>
              <LogOut size={18} />
            </button>
          )}
          
          <button 
            className="icon-btn" 
            onClick={onToggleDarkMode} 
            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            style={{ marginLeft: '0.25rem' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}