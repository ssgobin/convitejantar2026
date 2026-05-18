import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, XCircle, CheckCircle, RefreshCw, Keyboard, Loader } from 'lucide-react';
import jsQR from 'jsqr';
import FirebaseService, { HistoricoService } from '../services/firebase';

export default function ScannerCheckin({ showToast }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingGuest, setPendingGuest] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const stopCamera = useCallback(() => {
    setScanning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || processing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        processQRCode(code.data);
        return;
      }
    }

    if (scanning) {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [scanning, processing]);

  useEffect(() => {
    if (scanning && !processing) {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scanning, processing, scanQRCode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setScanning(true);
      setResult(null);
    } catch (err) {
      console.error('Erro câmera:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Permissão de câmera negada. Permite o acesso nas configurações.');
        showToast('Permissão negada', 'error');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Câmera não encontrada neste dispositivo.');
        showToast('Câmera não disponível', 'error');
      } else {
        setCameraError('Erro ao acessar câmera');
        showToast('Erro ao acessar câmera', 'error');
      }
    }
  };

  const processQRCode = async (data) => {
    if (processing) return;
    setProcessing(true);
    setLoading(true);
    
    try {
      const guest = await FirebaseService.buscarConvidadoPorQRCode(data);
      
      if (!guest) {
        setError('Convite não encontrado no sistema');
        showToast('Convite não encontrado', 'error');
        setLoading(false);
        setProcessing(false);
        return;
      }
      
      if (guest.checkedIn) {
        setResult({ type: 'already-used', guest, checkedInAt: guest.checkedInAt });
        showToast('Este convite já foi utilizado', 'warning');
      } else {
        setPendingGuest(guest);
        setShowConfirmModal(true);
        setLoading(false);
        setProcessing(false);
      }
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao processar');
      showToast('Erro ao processar', 'error');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const resetScanner = async () => {
    setResult(null);
    setError(null);
    setShowManualInput(false);
    setManualCode('');
    setProcessing(false);
    await startCamera();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      await processQRCode(manualCode.trim());
      setShowManualInput(false);
      setManualCode('');
    }
  };

  const confirmCheckIn = async () => {
    if (!pendingGuest) return;
    setShowConfirmModal(false);
    setLoading(true);
    
    try {
      await FirebaseService.realizarCheckIn(pendingGuest.id);
      await HistoricoService.adicionarAcesso('checkin', `${pendingGuest.nome} - Mesa ${pendingGuest.mesa}`);
      setResult({ type: 'success', guest: { ...pendingGuest, checkedIn: true } });
      showToast('Check-in realizado!', 'success');
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao processar');
      showToast('Erro ao processar', 'error');
    } finally {
      setLoading(false);
      setPendingGuest(null);
    }
  };

  const cancelCheckIn = () => {
    setShowConfirmModal(false);
    setPendingGuest(null);
  };

  return (
    <div>
      <h1 className="page-title">Check-in</h1>
      <p className="page-subtitle">Escaneie o QR Code do convidado</p>
      
      <div className="scanner-container">
        {result?.type === 'success' && (
          <div className="card">
            <div className="checkin-success">
              <div className="icon"><CheckCircle size={60} /></div>
              <h2>Entrada Liberada</h2>
              <p className="guest-name">{result.guest.nome}</p>
              <p className="mesa">Mesa {result.guest.mesa}</p>
              <button className="btn btn-primary" onClick={resetScanner} style={{ marginTop: '2rem' }}>
                <RefreshCw size={18} /> Novo Check-in
              </button>
            </div>
          </div>
        )}
        
        {result?.type === 'already-used' && (
          <div className="card">
            <div className="checkin-error">
              <div className="icon"><XCircle size={60} /></div>
              <h2>Convite Já Utilizado</h2>
              <p>{result.guest.nome}</p>
              <p>Mesa {result.guest.mesa}</p>
              <p>Check-in: {new Date(result.checkedInAt).toLocaleString()}</p>
              <button className="btn btn-secondary" onClick={resetScanner} style={{ marginTop: '2rem' }}>
                <RefreshCw size={18} /> Tentar Outro
              </button>
            </div>
          </div>
        )}
        
        {!result && (
          <div className="card">
            <div style={{
              width: '100%',
              height: '300px',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '1.5rem'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  display: scanning ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {!scanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)'
                }}>
                  <Camera size={48} style={{ color: '#c9a227', marginBottom: '0.5rem' }} />
                  <p style={{ color: '#999' }}>Câmera não iniciada</p>
                  {cameraError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', padding: '0 1rem' }}>{cameraError}</p>}
                </div>
              )}
              
              {scanning && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: '3px solid #c9a227',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 4px rgba(201,162,39,0.3)'
                }} />
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {!scanning ? (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={startCamera}>
                      <Camera size={20} /> Iniciar Câmera
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => setShowManualInput(true)}>
                      <Keyboard size={20} /> Entrada Manual
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary btn-lg" onClick={stopCamera}>
                    <XCircle size={20} /> Parar
                  </button>
                )}
              </div>
              
              {scanning && (
                <p style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Posicione o QR Code dentro do quadro
                </p>
              )}
              
              {showManualInput && (
                <form onSubmit={handleManualSubmit} style={{ marginTop: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite o ID do convite"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    style={{ maxWidth: '250px', marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button type="submit" className="btn btn-primary">Validar</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowManualInput(false)}>Cancelar</button>
                  </div>
                </form>
              )}
              
              {error && <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444' }}>{error}</div>}
              {loading && <div style={{ marginTop: '1rem' }}><Loader className="spinner" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} /></div>}
            </div>
          </div>
        )}
      </div>
      
      <div className="card" style={{ marginTop: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
        <p style={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
          Use "Entrada Manual" se a câmera não funcionar.<br/>
          Cada QR Code pode ser usado apenas uma vez.
        </p>
      </div>

      {showConfirmModal && pendingGuest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #2d2d2d, #1a1a1a)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            border: '1px solid #c9a227'
          }}>
            <h2 style={{ color: '#c9a227', marginBottom: '1.5rem' }}>Confirmar Check-in</h2>
            <p style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>{pendingGuest.nome}</p>
            <p style={{ color: '#999', marginBottom: '0.5rem' }}>Mesa {pendingGuest.mesa}</p>
            <p style={{ 
              color: '#c9a227', 
              fontWeight: 'bold',
              marginBottom: '2rem',
              padding: '0.5rem 1rem',
              background: 'rgba(201,162,39,0.1)',
              borderRadius: '8px',
              display: 'inline-block'
            }}>{pendingGuest.cargo || 'Convidado'}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={cancelCheckIn}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmCheckIn}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}