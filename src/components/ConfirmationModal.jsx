import { CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            background: type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(201, 162, 39, 0.15)'
          }}>
            {type === 'danger' ? (
              <XCircle size={32} color="var(--error)" />
            ) : (
              <CheckCircle size={32} color="var(--gold)" />
            )}
          </div>
          
          <h3 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.25rem', 
            color: 'var(--white)',
            marginBottom: '0.75rem'
          }}>
            {title}
          </h3>
          
          <p style={{ 
            color: 'var(--gray-400)', 
            fontSize: '0.9375rem',
            lineHeight: '1.6'
          }}>
            {message}
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          marginTop: '1.5rem'
        }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button 
            className={type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'} 
            onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}