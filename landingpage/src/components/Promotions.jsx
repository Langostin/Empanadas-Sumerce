import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { MessageCircle, Sparkles } from 'lucide-react';
import { getPromotions, WHATSAPP_FULL_URL } from '../services/api';
import './Promotions.css';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    getPromotions().then(setPromotions);
  }, []);

  return (
    <section className="section promotions" id="promociones" ref={ref}>
      <div className="container">
        <h2 className="section-title">Promociones Especiales</h2>
        <p className="section-subtitle">
          Aprovecha nuestras ofertas y disfruta del mejor sabor al mejor precio
        </p>

        <div className="promotions-grid">
          {promotions.map((promo, index) => (
            <div
              key={promo.id}
              className="neu-card promo-card"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease ${index * 0.15}s`,
              }}
            >
              <div className="promo-card-badge">
                <span className="badge badge-yellow">
                  <Sparkles size={12} style={{ marginRight: 4, display: 'inline' }} />
                  {promo.badge}
                </span>
              </div>

              <h3 className="promo-card-title">{promo.title}</h3>
              <p className="promo-card-description">{promo.description}</p>

              <div className="promo-card-pricing">
                <span className="promo-price-original">
                  ${promo.originalPrice.toFixed(0)}
                </span>
                <span className="promo-price-current">
                  <span className="promo-price-currency">$</span>
                  {promo.promoPrice.toFixed(0)}
                </span>
              </div>

              <a
                href={WHATSAPP_FULL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-button neu-button-primary promo-card-cta"
                id={`promo-cta-${promo.id}`}
              >
                <MessageCircle size={16} />
                Pedir ahora
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
