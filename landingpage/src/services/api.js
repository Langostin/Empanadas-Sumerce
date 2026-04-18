/**
 * API Service Layer — Empanadas Sumerce
 * 
 * CURRENT STATE: Returns mock data from mockData.js
 * 
 * MIGRATION GUIDE (SQL Server backend):
 * ─────────────────────────────────────
 * 1. Set up an Express/Fastify API server that connects to SQL Server
 *    (using `mssql` or `tedious` npm packages).
 * 2. Replace the BASE_URL below with your API endpoint.
 * 3. Uncomment the fetch-based implementation in each function.
 * 4. Remove the mockData import.
 * 
 * Expected API Endpoints:
 *   GET /api/products        → List all products
 *   GET /api/promotions      → Active promotions
 *   GET /api/team            → Team members
 *   GET /api/stats           → Dashboard stats (cached daily)
 *   GET /api/testimonials    → Positive and negative testimonials
 *   GET /api/gallery         → Gallery items (images + videos)
 */

import * as mockData from './mockData';

// TODO: Replace with your actual API URL when backend is ready
// const BASE_URL = 'http://localhost:3001/api';

/**
 * Generic fetch wrapper (uncomment when connecting to backend)
 */
// async function apiFetch(endpoint) {
//   const response = await fetch(`${BASE_URL}${endpoint}`);
//   if (!response.ok) {
//     throw new Error(`API Error: ${response.status} ${response.statusText}`);
//   }
//   return response.json();
// }

/** Get all products */
export async function getProducts() {
  // return apiFetch('/products');
  return mockData.products;
}

/** Get active promotions */
export async function getPromotions() {
  // return apiFetch('/promotions');
  return mockData.promotions;
}

/** Get team members */
export async function getTeamMembers() {
  // return apiFetch('/team');
  return mockData.teamMembers;
}

/** Get dashboard statistics — should be cached daily on the server */
export async function getStats() {
  // return apiFetch('/stats');
  return mockData.stats;
}

/** Get testimonials (positive and negative) */
export async function getTestimonials() {
  // return apiFetch('/testimonials');
  return mockData.testimonials;
}

/** Get gallery items */
export async function getGalleryItems() {
  // return apiFetch('/gallery');
  return mockData.galleryItems;
}

/**
 * WhatsApp configuration
 * Phone number in international format (Mexico)
 */
export const WHATSAPP_NUMBER = '526563153091';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_MESSAGE = encodeURIComponent(
  '¡Hola! Me gustaría hacer un pedido de empanadas 🥟'
);
export const WHATSAPP_FULL_URL = `${WHATSAPP_URL}?text=${WHATSAPP_MESSAGE}`;
