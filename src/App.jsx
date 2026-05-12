import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Cadastro from './components/Cadastro';
import GeradorConvite from './components/GeradorConvite';
import ScannerCheckin from './components/ScannerCheckin';
import DashboardAdmin from './components/DashboardAdmin';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Toast from './components/Toast';
import { useState, useEffect, createContext, useContext } from 'react';
import { AuthService, ConfigService } from './services/firebase';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

function App() {
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const savedUser = AuthService.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }

    ConfigService.getConfig().then(config => {
      if (config && config.darkMode !== undefined) {
        setDarkMode(config.darkMode);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  const handleToggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    ConfigService.updateConfig({ darkMode: newMode });
  };

  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const isInvitePage = location.pathname.startsWith('/convite/');
  const showNavbar = user && !isInvitePage;

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode: handleToggleDarkMode }}>
      <BrowserRouter>
        <div className="app">
          {showNavbar && <Navbar 
            user={user} 
            onLogout={handleLogout}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
          />}
          <main className="main-content" style={isInvitePage ? { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } : !user ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={user ? <Navigate to="/cadastro" replace /> : <Login onLogin={handleLoginSuccess} showToast={showToast} />} />
              <Route path="/cadastro" element={<ProtectedRoute><Cadastro showToast={showToast} /></ProtectedRoute>} />
              <Route path="/convite/:id" element={<GeradorConvite showToast={showToast || (() => {})} />} />
              <Route path="/checkin" element={<ProtectedRoute><ScannerCheckin showToast={showToast} /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><DashboardAdmin showToast={showToast} /></ProtectedRoute>} />
            </Routes>
          </main>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;