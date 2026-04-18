import QRCode from 'react-qr-code';
import { useInView } from 'react-intersection-observer';
import { MessageCircle, Smartphone } from 'lucide-react';
import { WHATSAPP_FULL_URL } from '../services/api';
import './WhatsAppQR.css';

export default function WhatsAppQR() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="section whatsapp-section" id="contacto" ref={ref}>
      <div className="container">
        <div
          className="whatsapp-content"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease',
          }}
        >
          <div className="whatsapp-text">
            <h2>
              <MessageCircle
                size={32}
                style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}
              />
              ¿Listo para ordenar?
            </h2>
            <p>
              Escanea el código QR con tu teléfono o toca el botón para abrir WhatsApp 
              directamente. ¡Te atendemos al instante!
            </p>

            {/* Mobile-friendly direct button */}
            <div style={{ marginTop: '1.5rem' }}>
              <a
                href={WHATSAPP_FULL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-button neu-button-primary whatsapp-direct-btn"
                id="whatsapp-direct-cta"
              >
                <Smartphone size={20} />
                Abrir WhatsApp
              </a>
            </div>
          </div>

          <div className="whatsapp-qr-wrapper">
            <div className="whatsapp-qr-card">
              <div className="whatsapp-qr-inner">
                <QRCode
                  value={WHATSAPP_FULL_URL}
                  size={180}
                  bgColor="#FFFFFF"
                  fgColor="#0A1628"
                  level="H"
                />
              </div>
              <p className="whatsapp-qr-label">
                Escanea para <strong>ordenar por WhatsApp</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
