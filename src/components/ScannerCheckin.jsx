import { useState, useEffect, useRef } from 'react';
import { Camera, XCircle, CheckCircle, RefreshCw, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import FirebaseService, { HistoricoService } from '../services/firebase';

export default function ScannerCheckin({ showToast }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    scannerRef.current = document.getElementById('qr-reader');
    return () => stopScanner();
  }, []);

  const stopScanner = () => {
    setScanning(false);
    try {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }
    } catch (e) {}
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);
      stopScanner();

      html5QrRef.current = new Html5Qrcode('qr-reader');

      await html5QrRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          processQRCode(decodedText);
        },
        () => {}
      );

      setScanning(true);
      setResult(null);
    } catch (err) {
      console.error('Erro ao iniciar:', err);
      setCameraError('Câmera não disponível. Use a entrada manual.');
      showToast('Erro ao acessar câmera', 'error');
    }
  };

  const processQRCode = async (data) => {
    await stopScanner();
    setLoading(true);
    
    try {
      const guest = await FirebaseService.buscarConvidadoPorQRCode(data);
      
      if (!guest) {
        setError('Convite não encontrado');
        showToast('Convite não encontrado', 'error');
        setLoading(false);
        return;
      }
      
      if (guest.checkedIn) {
        setResult({ type: 'already-used', guest, checkedInAt: guest.checkedInAt });
        showToast('Este convite já foi utilizado', 'warning');
      } else {
        await FirebaseService.realizarCheckIn(guest.id);
        await HistoricoService.adicionarAcesso('checkin', `${guest.nome} - Mesa ${guest.mesa}`);
        setResult({ type: 'success', guest: { ...guest, checkedIn: true } });
        showToast('Check-in realizado!', 'success');
      }
    } catch (err) {
      setError('Erro ao processar');
      showToast('Erro ao processar QR', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setShowManualInput(false);
    setManualCode('');
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
    <div style={{ position: 'relative', zIndex: 100 }}>
      <h1 className="page-title">Check-in</h1>
      <p className="page-subtitle">Escaneie o QR Code</p>
      
      <div className="scanner-container" style={{ position: 'relative', zIndex: 100 }}>
        {result?.type === 'success' && (
          <div className="card">
            <div className="checkin-success">
              <div className="icon"><CheckCircle size={60} /></div>
              <h2>Entrada Liberada</h2>
              <p className="guest-name">{result.guest.nome}</p>
              <p className="mesa">Mesa {result.guest.mesa}</p>
              <button className="btn btn-primary" onClick={resetScanner} style={{ marginTop: '2rem' }}>Novo Check-in</button>
            </div>
          </div>
        )}
        
        {result?.type === 'already-used' && (
          <div className="card">
            <div className="checkin-error">
              <div className="icon"><XCircle size={60} /></div>
              <h2>Convite Já Utilizado</h2>
              <p>{result.guest.nome} - Mesa {result.guest.mesa}</p>
              <p>Em: {new Date(result.checkedInAt).toLocaleString()}</p>
              <button className="btn btn-secondary" onClick={resetScanner} style={{ marginTop: '2rem' }}>Tentar Outro</button>
            </div>
          </div>
        )}
        
        {!result && (
          <div className="card" style={{ position: 'relative', zIndex: 100 }}>
            <div style={{ 
              width: '100%', 
              height: '320px', 
              background: '#000', 
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '1.5rem'
            }}>
              <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
              
              {!scanning && (
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)'
                }}>
                  <Camera size={48} style={{ color: '#c9a227', marginBottom: '0.5rem' }} />
                  <p style={{ color: '#999' }}>Inicie a câmera</p>
                  {cameraError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{cameraError}</p>}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 100 }}>
              {!scanning ? (
                <>
                  <button className="btn btn-primary" onClick={startCamera}><Camera size={18} /> Iniciar</button>
                  <button className="btn btn-secondary" onClick={() => setShowManualInput(true)}><Keyboard size={18} /> Manual</button>
                </>
              ) : (
                <button className="btn btn-secondary" onClick={stopCamera}><XCircle size={18} /> Parar</button>
              )}
            </div>
            
            {showManualInput && (
              <form onSubmit={handleManualSubmit} style={{ marginTop: '1rem', textAlign: 'center' }}>
                <input type="text" className="form-input" placeholder="ID do convite" value={manualCode} onChange={e => setManualCode(e.target.value)} style={{ maxWidth: '250px' }} />
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button type="submit" className="btn btn-primary btn-sm">Validar</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowManualInput(false)}>Cancelar</button>
                </div>
              </form>
            )}
            
            {error && <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', textAlign: 'center' }}>{error}</div>}
            {loading && <div style={{ marginTop: '1rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}
          </div>
        )}
      </div>
      
      <div className="card" style={{ marginTop: '2rem', maxWidth: '500px', margin: '2rem auto', position: 'relative', zIndex: 100 }}>
        <p style={{ color: '#999', fontSize: '0.875rem' }}>
          Use "Entrada Manual" se a câmera não funcionar.<br/>
          Cada QR Code pode ser usado apenas uma vez.
        </p>
      </div>
    </div>
  );
}