import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />
  };

  return (
    <div className={`toast ${type}`}>
      {icons[type]}
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }}>
        <X size={16} />
      </button>
    </div>
  );
}