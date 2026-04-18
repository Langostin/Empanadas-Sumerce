import { useState, useEffect } from 'react';
import { MessageCircle, Home, Tag, Briefcase, Image, Users, BarChart3 } from 'lucide-react';
import { WHATSAPP_FULL_URL } from '../services/api';
import './Navbar.css';

const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'promociones', label: 'Promos', icon: Tag },
  { id: 'servicios', label: 'Servicios', icon: Briefcase },
  { id: 'galeria', label: 'Galería', icon: Image },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'estadisticas', label: 'Stats', icon: BarChart3 },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="container navbar-inner">
        <a href="#inicio" className="navbar-logo" onClick={closeMenu}>
          <img src="/logo.png" alt="Empanadas Sumerce" />
          <span className="navbar-logo-text">Sumerce</span>
        </a>

        {/* Hamburger toggle */}
        <button
          className={`navbar-toggle ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          id="navbar-toggle"
        >
          <div className="navbar-toggle-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Dark backdrop */}
        <div
          className={`navbar-overlay ${isOpen ? 'visible' : ''}`}
          onClick={closeMenu}
        />

        {/* Slide-in menu */}
        <div className={`navbar-menu ${isOpen ? 'open' : ''}`}>
          <div className="navbar-menu-header">
            <span className="navbar-menu-title">Menú</span>
          </div>

          <div className="navbar-menu-links">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="navbar-link"
                  onClick={closeMenu}
                  id={`nav-link-${link.id}`}
                >
                  <div className="navbar-link-icon">
                    <Icon size={16} />
                  </div>
                  {link.label}
                </a>
              );
            })}
          </div>

          <div className="navbar-menu-cta">
            <a
              href={WHATSAPP_FULL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-button neu-button-primary"
              id="navbar-whatsapp-cta"
              onClick={closeMenu}
            >
              <MessageCircle size={18} />
              Ordenar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
