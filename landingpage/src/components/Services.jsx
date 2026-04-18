import { useInView } from 'react-intersection-observer';
import { ShoppingBag, PartyPopper, Check, MessageCircle } from 'lucide-react';
import { WHATSAPP_FULL_URL } from '../services/api';
import './Services.css';

const SERVICES = [
  {
    id: 'orders',
    icon: <ShoppingBag size={28} />,
    iconClass: 'service-card-icon-orders',
    cardClass: 'service-card-orders',
    title: 'Órdenes Individuales',
    description:
      'Pide tus empanadas favoritas para llevar o a domicilio. Desde una hasta cientos, siempre frescas y recién hechas con los mejores ingredientes.',
    features: [
      'Empanadas recién hechas al momento',
      'Variedad de sabores clásicos y especiales',
      'Salsas artesanales incluidas',
      'Pedidos por WhatsApp — rápido y fácil',
    ],
  },
  {
    id: 'events',
    icon: <PartyPopper size={28} />,
    iconClass: 'service-card-icon-events',
    cardClass: 'service-card-events',
    title: 'Eventos & Catering',
    description:
      'Hacemos de tu evento algo especial. Bodas, cumpleaños, reuniones corporativas o fiestas. Llevamos el sabor colombiano a donde lo necesites.',
    features: [
      'Packs desde 50 hasta 500+ empanadas',
      'Montaje y presentación incluida',
      'Menú personalizable para tu evento',
      'Cotización sin compromiso por WhatsApp',
    ],
  },
];

export default function Services() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="section" id="servicios" ref={ref}>
      <div className="container">
        <h2 className="section-title">Nuestros Servicios</h2>
        <p className="section-subtitle">
          Ya sea para un antojo personal o un evento inolvidable, tenemos la solución perfecta
        </p>

        <div className="services-grid">
          {SERVICES.map((service, index) => (
            <div
              key={service.id}
              className={`neu-card service-card ${service.cardClass}`}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease ${index * 0.2}s`,
              }}
            >
              <div className={`service-card-icon ${service.iconClass}`}>
                {service.icon}
              </div>

              <h3 className="service-card-title">{service.title}</h3>
              <p className="service-card-description">{service.description}</p>

              <div className="service-card-features">
                {service.features.map((feat, i) => (
                  <div key={i} className="service-feature">
                    <Check size={16} className="service-feature-check" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_FULL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-button neu-button-primary"
                id={`service-cta-${service.id}`}
              >
                <MessageCircle size={16} />
                {service.id === 'events' ? 'Cotizar evento' : 'Hacer pedido'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
