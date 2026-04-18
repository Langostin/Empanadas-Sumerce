import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import {
  ShoppingCart,
  Users,
  CalendarCheck,
  ThumbsUp,
  ThumbsDown,
  Star,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { getStats, getTestimonials } from '../services/api';
import './Stats.css';

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [testimonials, setTestimonials] = useState(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: barsRef, inView: barsInView } = useInView({ triggerOnce: true, threshold: 0.3 });

  useEffect(() => {
    getStats().then(setStats);
    getTestimonials().then(setTestimonials);
  }, []);

  if (!stats || !testimonials) return null;

  const COUNTERS = [
    {
      icon: <ShoppingCart size={22} />,
      iconClass: 'stat-counter-icon-yellow',
      value: stats.productsSold,
      label: 'Productos vendidos',
      suffix: '+',
    },
    {
      icon: <Users size={22} />,
      iconClass: 'stat-counter-icon-blue',
      value: stats.peopleServed,
      label: 'Personas atendidas',
      suffix: '+',
    },
    {
      icon: <CalendarCheck size={22} />,
      iconClass: 'stat-counter-icon-yellow',
      value: stats.eventsAttended,
      label: 'Eventos atendidos',
      suffix: '',
    },
    {
      icon: <ThumbsUp size={22} />,
      iconClass: 'stat-counter-icon-blue',
      value: stats.positiveComments,
      label: 'Comentarios positivos',
      suffix: '',
    },
  ];

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'testimonial-star' : 'testimonial-star-empty'}
        fill={i < rating ? 'currentColor' : 'none'}
      />
    ));

  return (
    <section className="section stats-section" id="estadisticas" ref={ref}>
      <div className="container">
        <h2 className="section-title">Nuestros Números</h2>
        <p className="section-subtitle">
          Cifras que hablan de nuestra dedicación y la confianza de nuestros clientes
        </p>

        {/* Animated Counters */}
        <div className="stats-counters">
          {COUNTERS.map((counter, index) => (
            <div
              key={index}
              className="neu-card-flat stat-counter-card"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.5s ease ${index * 0.1}s`,
              }}
            >
              <div className={`stat-counter-icon ${counter.iconClass}`}>{counter.icon}</div>
              <div className="stat-counter-number">
                {inView ? (
                  <CountUp
                    end={counter.value}
                    duration={2.5}
                    separator=","
                    suffix={counter.suffix}
                  />
                ) : (
                  0
                )}
              </div>
              <div className="stat-counter-label">{counter.label}</div>
            </div>
          ))}
        </div>

        {/* Popular Products */}
        <div className="stats-popular" ref={barsRef}>
          <h3 className="stats-popular-title">
            <TrendingUp size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Productos Más Populares
          </h3>
          <div className="popular-bars">
            {stats.popularProducts.map((product, i) => (
              <div key={i} className="popular-bar-item">
                <span className="popular-bar-name">{product.name}</span>
                <div className="popular-bar-track">
                  <div
                    className="popular-bar-fill"
                    style={{
                      width: barsInView ? `${product.percentage}%` : '0%',
                      transitionDelay: `${i * 0.15}s`,
                    }}
                  />
                </div>
                <span className="popular-bar-value">{product.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="stats-testimonials">
          <h3 className="stats-testimonials-title">Lo que dicen nuestros clientes</h3>

          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <span className="badge badge-yellow" style={{ marginRight: 8 }}>
              <ThumbsUp size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {stats.positiveComments} positivos
            </span>
            <span className="badge badge-blue">
              <ThumbsDown size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {stats.negativeComments} negativos
            </span>
          </div>

          <div className="testimonials-grid">
            {testimonials.positive.slice(0, 2).map((t) => (
              <div key={t.id} className="neu-card-inset testimonial-card">
                <span className="testimonial-type testimonial-type-positive">
                  <ThumbsUp size={12} />
                  Positivo
                </span>
                <div className="testimonial-rating">{renderStars(t.rating)}</div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-header">
                  <span className="testimonial-author">{t.author}</span>
                  <span className="testimonial-date">{t.date}</span>
                </div>
              </div>
            ))}
            {testimonials.negative.slice(0, 1).map((t) => (
              <div key={t.id} className="neu-card-inset testimonial-card">
                <span className="testimonial-type testimonial-type-negative">
                  <ThumbsDown size={12} />
                  Área de mejora
                </span>
                <div className="testimonial-rating">{renderStars(t.rating)}</div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-header">
                  <span className="testimonial-author">{t.author}</span>
                  <span className="testimonial-date">{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last updated */}
        <div className="stats-updated">
          <span className="stats-updated-badge">
            <Clock size={14} />
            Última actualización: {stats.lastUpdated}
          </span>
        </div>
      </div>
    </section>
  );
}
