import { useState, useEffect, useRef } from 'react';
import { Camera, XCircle, CheckCircle, RefreshCw, QrCode, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import FirebaseService, { HistoricoService } from '../services/firebase';

export default function ScannerCheckin({ showToast }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = document.getElementById('qr-reader');
      }
      
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          processQRCode(decodedText);
        },
        () => {}
      );
      
      setScanning(true);
      setResult(null);
      setError(null);
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err);
      showToast('Erro ao acessar câmera. Verifique as permissões.', 'error');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }
    setScanning(false);
  };

  const processQRCode = async (data) => {
    setLoading(true);
    await stopCamera();
    
    try {
      const guest = await FirebaseService.buscarConvidadoPorQRCode(data);
      
      if (!guest) {
        setError('Convite não encontrado no sistema');
        showToast('Convite não encontrado', 'error');
        setLoading(false);
        return;
      }
      
      if (guest.checkedIn) {
        setResult({
          type: 'already-used',
          guest,
          checkedInAt: guest.checkedInAt
        });
        showToast('Este convite já foi utilizado', 'warning');
      } else {
        await FirebaseService.realizarCheckIn(guest.id);
        await HistoricoService.adicionarAcesso('checkin', `${guest.nome} - Mesa ${guest.mesa}`);
        setResult({
          type: 'success',
          guest: { ...guest, checkedIn: true }
        });
        showToast('Check-in realizado com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao processar QR Code:', err);
      setError('Erro ao processar o código');
      showToast('Erro ao processar QR Code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setShowManualInput(false);
    setManualCode('');
    startCamera();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      await processQRCode(manualCode.trim());
      setShowManualInput(false);
      setManualCode('');
    }
  };

  return (
    <div>
      <h1 className="page-title">Check-in</h1>
      <p className="page-subtitle">Escaneie o QR Code para validar a entrada</p>
      
      <div className="scanner-container">
        {result?.type === 'success' && (
          <div className="card">
            <div className="checkin-success">
              <div className="icon">
                <CheckCircle size={60} />
              </div>
              <h2>Entrada Liberada</h2>
              <p className="guest-name">{result.guest.nome}</p>
              <p className="mesa">Mesa {result.guest.mesa}</p>
              
              <button className="btn btn-primary" onClick={resetScanner} style={{ marginTop: '2rem' }}>
                <RefreshCw size={18} />
                Novo Check-in
              </button>
            </div>
          </div>
        )}
        
        {result?.type === 'already-used' && (
          <div className="card">
            <div className="checkin-error">
              <div className="icon">
                <XCircle size={60} />
              </div>
              <h2>Convite Já Utilizado</h2>
              <p className="info">{result.guest.nome}</p>
              <p className="info">Mesa {result.guest.mesa}</p>
              <p className="time">
                Check-in realizado em: {new Date(result.checkedInAt).toLocaleString('pt-BR')}
              </p>
              
              <button className="btn btn-secondary" onClick={resetScanner} style={{ marginTop: '2rem' }}>
                <RefreshCw size={18} />
                Tentar Outro
              </button>
            </div>
          </div>
        )}
        
        {!result && (
          <div className="card">
            <div className="scanner-video" id="qr-reader" style={{ width: '100%', minHeight: '300px' }}>
              {!scanning && (
                <div className="scanner-placeholder">
                  <Camera size={64} />
                  <p>Câmera não iniciada</p>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              {!scanning ? (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-lg" onClick={startCamera}>
                    <Camera size={20} />
                    Iniciar Câmera
                  </button>
                  <button className="btn btn-secondary btn-lg" onClick={() => setShowManualInput(true)}>
                    <Keyboard size={20} />
                    Entrada Manual
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--gray-400)', marginBottom: '1rem' }}>
                    Posicione o QR Code em frente à câmera
                  </p>
                  <button className="btn btn-secondary" onClick={stopCamera}>
                    <XCircle size={18} />
                    Parar Scanner
                  </button>
                </div>
              )}
              
              {showManualInput && (
                <form onSubmit={handleManualSubmit} style={{ marginTop: '1.5rem', maxWidth: '300px', margin: '1.5rem auto' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite o ID do convite"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button type="submit" className="btn btn-primary">
                      Validar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowManualInput(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
              
              {error && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--error)' }}>
                  {error}
                </div>
              )}
              
              {loading && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <p style={{ color: 'var(--gray-400)', marginTop: '0.5rem' }}>Processando...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="card" style={{ marginTop: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
          <p style={{ marginBottom: '0.5rem' }}>Instruções:</p>
          <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
            <li>Clique em "Iniciar Câmera" para ativar o leitor</li>
            <li>Aponte a câmera para o QR Code do convite</li>
            <li>Ou use "Entrada Manual" para digitar o ID do convite</li>
            <li>O sistema validará automaticamente a entrada</li>
            <li>Cada QR Code pode ser usado apenas uma vez</li>
          </ul>
        </div>
      </div>
    </div>
  );
}