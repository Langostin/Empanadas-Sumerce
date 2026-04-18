import { MessageCircle, MapPin, Clock } from 'lucide-react';
import './Footer.css';

const QUICK_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Promociones', href: '#promociones' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Galería', href: '#galeria' },
];

const MORE_LINKS = [
  { label: 'Equipo', href: '#equipo' },
  { label: 'Estadísticas', href: '#estadisticas' },
  { label: 'Redes Sociales', href: '#redes' },
  { label: 'WhatsApp', href: '#contacto' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Empanadas Sumerce" />
              <span className="footer-logo-text">Sumerce</span>
            </div>
            <p className="footer-description">
              Empanadas colombianas artesanales hechas con amor y los mejores ingredientes. 
              Pedidos individuales y para eventos.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="footer-column-title">Navegación</h4>
            <div className="footer-links">
              {QUICK_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* More links */}
          <div>
            <h4 className="footer-column-title">Más</h4>
            <div className="footer-links">
              {MORE_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="footer-column-title">Contacto</h4>
            <div className="footer-contact-item">
              <MessageCircle size={16} />
              <span>656 315 3091</span>
            </div>
            <div className="footer-contact-item">
              <MapPin size={16} />
              <span>Ciudad Juárez, Chihuahua</span>
            </div>
            <div className="footer-contact-item">
              <Clock size={16} />
              <span>Lun-Dom · 9:00 - 21:00</span>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Empanadas Sumerce. Todos los derechos reservados.
          </p>
          <p className="footer-made-with">
            Hecho con <span>♥</span> en México
          </p>
        </div>
      </div>
    </footer>
  );
}
