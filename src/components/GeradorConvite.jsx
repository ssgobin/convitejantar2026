import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, QrCode, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FirebaseService from '../services/firebase';

const defaultShowToast = () => {};

export default function GeradorConvite({ showToast = defaultShowToast }) {
  const { id } = useParams();
  const [convidado, setConvidado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const inviteRef = useRef(null);

  useEffect(() => {
    async function carregarConvidado() {
      try {
        setError(null);
        const guest = await FirebaseService.buscarConvidadoPorId(id);
        if (guest) {
          setConvidado(guest);
          if (guest.qrCodeId) {
            const qrDataUrl = await QRCode.toDataURL(guest.qrCodeId, {
              width: 180,
              margin: 2,
              color: {
                dark: '#1a1a1a',
                light: '#ffffff'
              }
            });
            setQrCodeUrl(qrDataUrl);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar convidado:', error);
        setError('Erro ao carregar convite. Tente novamente mais tarde.');
        showToast('Erro ao carregar convite', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    carregarConvidado();
  }, [id]);

  const gerarPDF = async () => {
    if (!inviteRef.current) return;

    try {
      setGerandoPDF(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(inviteRef.current, {
        scale: 2,
        backgroundColor: '#1a1a1a',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = 20;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`convite-${convidado.nome.replace(/\s+/g, '-')}.pdf`);
      
      showToast('PDF baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showToast('Erro ao gerar PDF', 'error');
    } finally {
      setGerandoPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-container">
        <div className="card">
          <div className="empty-state">
            <QrCode size={64} />
            <h3>Erro</h3>
            <p>{error}</p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!convidado) {
    return (
      <div className="empty-state">
        <QrCode size={64} />
        <h3>Convite não encontrado</h3>
        <p>O convite solicitado não foi encontrado.</p>
        <Link to="/cadastro" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={18} />
          Voltar ao Cadastro
        </Link>
      </div>
    );
  }

  return (
    <div className="invite-container" style={{ maxWidth: '500px' }}>
      <div className="invite-preview" ref={inviteRef} style={{ padding: '3rem 2rem', background: '#1a1a1a' }}>
        <img 
          src="/Logo.png" 
          alt="Logo ACIA" 
          style={{ 
            width: '120px', 
            marginBottom: '1.5rem'
          }} 
        />
        
        <p className="invite-guest" style={{ fontSize: '1.5rem', fontWeight: '600' }}>{convidado.nome}</p>
        
        {convidado.empresa && (
          <p style={{ color: 'var(--gold)', fontSize: '1rem', marginBottom: '1.5rem' }}>{convidado.empresa}</p>
        )}
        
        <div style={{ 
          background: 'rgba(201, 162, 39, 0.15)', 
          borderRadius: '12px', 
          padding: '1rem 2.5rem',
          display: 'inline-block',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mesa</div>
            <div style={{ fontSize: '2rem', color: 'var(--gold)', fontWeight: '700' }}>{convidado.mesa}</div>
          </div>
        </div>
        
        <div className="invite-qr">
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR Code" style={{ width: '160px', height: '160px', borderRadius: '12px', border: '3px solid var(--gold)' }} />
          )}
        </div>
        
        <p style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Apresente este QR Code na entrada do evento
        </p>
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-primary" onClick={gerarPDF} disabled={gerandoPDF}>
          <FileText size={18} />
          {gerandoPDF ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
      </div>
    </div>
  );
}
