/**
 * Mock data for Empanadas Sumerce
 * 
 * MIGRATION GUIDE (SQL Server):
 * Each export here maps to a database table/view.
 * Replace these constants with API calls in api.js when the backend is ready.
 * 
 * Expected tables:
 *   - dbo.Products       → products
 *   - dbo.Promotions     → promotions
 *   - dbo.TeamMembers    → teamMembers
 *   - dbo.Stats          → stats
 *   - dbo.Testimonials   → testimonials
 *   - dbo.GalleryItems   → galleryItems
 */

export const products = [
  {
    id: 1,
    name: 'Empanada de Carne',
    description: 'Deliciosa empanada rellena de carne molida sazonada con especias colombianas.',
    price: 25.00,
    category: 'clásicas',
    isPopular: true,
    imageUrl: null, // placeholder — will come from DB or CDN
  },
  {
    id: 2,
    name: 'Empanada de Pollo',
    description: 'Tierno pollo desmenuzado con sofrito casero y un toque de comino.',
    price: 25.00,
    category: 'clásicas',
    isPopular: true,
    imageUrl: null,
  },
  {
    id: 3,
    name: 'Empanada de Queso',
    description: 'Queso fundido con un exterior crujiente y dorado perfecto.',
    price: 22.00,
    category: 'clásicas',
    isPopular: false,
    imageUrl: null,
  },
  {
    id: 4,
    name: 'Empanada Hawaiana',
    description: 'Jamón, piña y queso en una combinación dulce-salada irresistible.',
    price: 28.00,
    category: 'especiales',
    isPopular: true,
    imageUrl: null,
  },
  {
    id: 5,
    name: 'Empanada de Frijol con Queso',
    description: 'Frijoles refritos y queso oaxaca derretido. Un clásico reinventado.',
    price: 22.00,
    category: 'especiales',
    isPopular: false,
    imageUrl: null,
  },
  {
    id: 6,
    name: 'Empanada de Chorizo',
    description: 'Chorizo artesanal con papa y un toque de chile. Sabor intenso.',
    price: 28.00,
    category: 'especiales',
    isPopular: false,
    imageUrl: null,
  },
];

export const promotions = [
  {
    id: 1,
    title: '🔥 Combo Familiar',
    description: '12 empanadas surtidas + 2 salsas artesanales',
    originalPrice: 300.00,
    promoPrice: 250.00,
    badge: 'Más vendido',
    isActive: true,
  },
  {
    id: 2,
    title: '🎉 Pack Fiesta',
    description: '50 empanadas para tu evento + ají y guacamole',
    originalPrice: 1250.00,
    promoPrice: 999.00,
    badge: 'Eventos',
    isActive: true,
  },
  {
    id: 3,
    title: '⭐ Duo Sumerce',
    description: '2 empanadas + bebida artesanal',
    originalPrice: 75.00,
    promoPrice: 55.00,
    badge: 'Nuevo',
    isActive: true,
  },
];

export const teamMembers = [
  {
    id: 1,
    name: 'Eric Santiago',
    role: 'Fundador & Chef Principal',
    bio: 'Con más de 15 años de experiencia en cocina colombiana, Eric trae los sabores auténticos de su abuela a cada empanada.',
    avatarUrl: null, // placeholder
  },
  {
    id: 2,
    name: 'Marvin Lopez',
    role: 'Co-Fundador & Operaciones',
    bio: 'Marvin se asegura de que cada pedido llegue perfecto, coordinando eventos y órdenes con pasión.',
    avatarUrl: null,
  },
  {
    id: 3,
    name: 'Fernando Ramirez',
    role: 'Chef de Producción',
    bio: 'Fernando prepara la masa y los rellenos frescos cada día, manteniendo la calidad artesanal.',
    avatarUrl: null,
  },
];

export const stats = {
  productsSold: 15420,
  peopleServed: 8750,
  eventsAttended: 124,
  positiveComments: 342,
  negativeComments: 12,
  lastUpdated: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  popularProducts: [
    { name: 'Empanada de Carne', percentage: 35 },
    { name: 'Empanada de Pollo', percentage: 28 },
    { name: 'Empanada Hawaiana', percentage: 20 },
    { name: 'Empanada de Queso', percentage: 17 },
  ],
};

export const testimonials = {
  positive: [
    {
      id: 1,
      author: 'Laura G.',
      text: '¡Las mejores empanadas que he probado fuera de Colombia! El sabor es auténtico y la atención increíble.',
      rating: 5,
      date: '2026-03-15',
    },
    {
      id: 2,
      author: 'Roberto M.',
      text: 'Pedimos el pack fiesta para mi cumpleaños. Todos quedaron encantados, se acabaron en 20 minutos.',
      rating: 5,
      date: '2026-03-22',
    },
    {
      id: 3,
      author: 'Ana S.',
      text: 'La empanada hawaiana es una delicia. Nunca pensé que la combinación funcionaría tan bien.',
      rating: 5,
      date: '2026-04-01',
    },
  ],
  negative: [
    {
      id: 4,
      author: 'Diego P.',
      text: 'El pedido tardó un poco más de lo esperado, pero el sabor compensó la espera.',
      rating: 3,
      date: '2026-02-28',
    },
    {
      id: 5,
      author: 'Carmen R.',
      text: 'Me hubiera gustado más variedad de salsas. Las empanadas estaban buenas.',
      rating: 3,
      date: '2026-03-10',
    },
  ],
};

export const galleryItems = [
  { id: 1, type: 'image', title: 'Nuestras empanadas', src: 'hero', category: 'producto' },
  { id: 2, type: 'image', title: 'Ingredientes frescos', src: 'gallery_process', category: 'proceso' },
  { id: 3, type: 'image', title: 'Empanada dorada', src: 'gallery_closeup', category: 'producto' },
  { id: 4, type: 'image', title: 'Eventos', src: 'gallery_event', category: 'eventos' },
  { id: 5, type: 'image', title: 'Variedad de sabores', src: 'gallery_variety', category: 'producto' },
  { id: 6, type: 'video', title: 'Cómo hacemos nuestras empanadas', src: null, category: 'proceso' },
  { id: 7, type: 'video', title: 'Un día en Sumerce', src: null, category: 'proceso' },
];
