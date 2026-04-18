import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { getGalleryItems } from '../services/api';

// Import gallery images statically
import heroImg from '../assets/hero.png';
import processImg from '../assets/gallery_process.png';
import closeupImg from '../assets/gallery_closeup.png';
import eventImg from '../assets/gallery_event.png';
import varietyImg from '../assets/gallery_variety.png';
import './Gallery.css';

const IMAGE_MAP = {
  hero: heroImg,
  gallery_process: processImg,
  gallery_closeup: closeupImg,
  gallery_event: eventImg,
  gallery_variety: varietyImg,
};

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'producto', label: 'Producto' },
  { key: 'proceso', label: 'Proceso' },
  { key: 'eventos', label: 'Eventos' },
];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    getGalleryItems().then(setItems);
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filter]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % filtered.length);
  }, [filtered.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
  }, [filtered.length]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e) => {
      if (lightboxImg) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, lightboxImg]);

  /**
   * Compute coverflow transform for each card based on distance from active.
   * Center = scale(1), sides angled with rotateY and shifted on X.
   */
  function getCoverflowStyle(index) {
    const total = filtered.length;
    let diff = index - activeIndex;

    // Wrap around for circular effect
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const isActive = diff === 0;
    const absD = Math.abs(diff);

    // Only show up to 3 cards on each side
    if (absD > 3) {
      return {
        opacity: 0,
        transform: `translate(-50%, -50%) translateX(${diff * 200}px) scale(0.5)`,
        zIndex: 0,
        pointerEvents: 'none',
      };
    }

    const translateX = diff * 160;
    const rotateY = diff * -35;
    const scale = isActive ? 1 : Math.max(0.65, 1 - absD * 0.15);
    const opacity = isActive ? 1 : Math.max(0.4, 1 - absD * 0.25);
    const zIndex = 10 - absD;

    return {
      transform: `translate(-50%, -50%) translateX(${translateX}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      pointerEvents: isActive ? 'auto' : 'auto',
    };
  }

  function handleItemClick(index, item) {
    if (index === activeIndex) {
      // Clicking active card → open lightbox
      if (item.type === 'image' && IMAGE_MAP[item.src]) {
        setLightboxImg(IMAGE_MAP[item.src]);
      }
    } else {
      // Clicking side card → navigate to it
      setActiveIndex(index);
    }
  }

  if (filtered.length === 0) return null;

  return (
    <section className="section" id="galeria">
      <div className="container">
        <h2 className="section-title">Galería</h2>
        <p className="section-subtitle">
          Descubre nuestro proceso artesanal y la variedad de sabores que ofrecemos
        </p>

        <div className="gallery-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`gallery-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              id={`gallery-filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Coverflow */}
        <div className="gallery-coverflow">
          <div className="gallery-coverflow-track">
            {filtered.map((item, index) => (
              <div
                key={item.id}
                className={`gallery-coverflow-item ${index === activeIndex ? 'coverflow-active' : ''}`}
                style={getCoverflowStyle(index)}
                onClick={() => handleItemClick(index, item)}
              >
                {item.type === 'image' ? (
                  <>
                    <img src={IMAGE_MAP[item.src]} alt={item.title} loading="lazy" />
                    <div className="gallery-coverflow-overlay">
                      <p className="gallery-coverflow-cat">{item.category}</p>
                      <p className="gallery-coverflow-title">{item.title}</p>
                    </div>
                  </>
                ) : (
                  <div className="gallery-coverflow-video">
                    <div className="gallery-coverflow-video-play">
                      <Play size={24} />
                    </div>
                    <p className="gallery-coverflow-video-label">{item.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="gallery-nav">
          <button
            className="gallery-nav-btn"
            onClick={goPrev}
            aria-label="Anterior"
            id="gallery-prev"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="gallery-dots">
            {filtered.map((_, i) => (
              <button
                key={i}
                className={`gallery-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="gallery-nav-btn"
            onClick={goNext}
            aria-label="Siguiente"
            id="gallery-next"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="gallery-lightbox" onClick={() => setLightboxImg(null)}>
          <button
            className="gallery-lightbox-close"
            onClick={() => setLightboxImg(null)}
            aria-label="Cerrar"
            id="gallery-lightbox-close"
          >
            <X size={20} />
          </button>
          <img src={lightboxImg} alt="Vista ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
