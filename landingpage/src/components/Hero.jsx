import { MessageCircle, ChevronDown } from 'lucide-react';
import { WHATSAPP_FULL_URL } from '../services/api';
import heroImg from '../assets/hero.png';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="inicio">
      {/* Background */}
      <div className="hero-bg">
        <img src={heroImg} alt="Empanadas Sumerce" />
      </div>
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />

      <div className="container hero-content">
        <div className="hero-badge">
          <span className="badge badge-yellow">🥟 Sabor colombiano auténtico</span>
        </div>

        <h1 className="hero-title">
          Empanadas hechas <br />
          con <span className="hero-title-accent">amor y tradición</span>
        </h1>

        <p className="hero-description">
          En Sumerce traemos el sabor auténtico de las empanadas colombianas a tu mesa. 
          Ingredientes frescos, recetas de la abuela y una pasión que se siente en cada bocado.
        </p>

        <div className="hero-actions">
          <a
            href={WHATSAPP_FULL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="neu-button neu-button-primary hero-cta-primary"
            id="hero-whatsapp-cta"
          >
            <MessageCircle size={20} />
            Ordena por WhatsApp
          </a>
          <a
            href="#promociones"
            className="neu-button neu-button-secondary hero-cta-secondary"
            id="hero-promos-cta"
          >
            Ver promociones
            <ChevronDown size={18} />
          </a>
        </div>

        <div className="hero-stats-strip">
          <div className="hero-stat">
            <div className="hero-stat-number">15K+</div>
            <div className="hero-stat-label">Vendidas</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-number">8.7K+</div>
            <div className="hero-stat-label">Clientes</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-number">120+</div>
            <div className="hero-stat-label">Eventos</div>
          </div>
        </div>
      </div>
    </section>
  );
}
