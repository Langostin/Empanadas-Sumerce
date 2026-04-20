/**
 * config/index.js
 * Todas las variables de entorno en un único lugar.
 * Importar con: const config = require("../config")
 */
require("dotenv").config()

module.exports = {
  // ── Base de datos ─────────────────────────────────────────────
  db: {
    user:     process.env.DB_USER     || "sa",
    password: process.env.DB_PASSWORD || "sqlserver6488",
    server:   process.env.DB_SERVER   || "localhost",
    database: process.env.DB_NAME     || "EmpanadasSumerce",
    port:     parseInt(process.env.DB_PORT || "1433"),
  },

  // ── Servidor Express ──────────────────────────────────────────
  port: parseInt(process.env.PORT || "3000"),
  baseUrl: process.env.BASE_URL || "http://localhost:3000",

  // ── Stripe ────────────────────────────────────────────────────
  stripe: {
    secretKey:     process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publicKey:     process.env.STRIPE_PUBLIC_KEY,
  },

  // ── Facturama ─────────────────────────────────────────────────
  facturama: {
    sandbox:  process.env.FACTURAMA_SANDBOX,
    user:     process.env.FACTURAMA_USER,
    password: process.env.FACTURAMA_PASS,
  },

  // ── Emisor fiscal (el negocio) ────────────────────────────────
  emisor: {
    rfc:          process.env.EMISOR_RFC              || "EMP020101AA1",
    nombre:       process.env.EMISOR_NOMBRE           || "EMPANADAS SUMERCE",
    regimen:      process.env.EMISOR_REGIMEN          || "621",
    lugarExpedicion: process.env.EMISOR_LUGAR_EXPEDICION || "32000",
  },

  // ── Gemini IA ─────────────────────────────────────────────────
  gemini: {
    apiKey:    process.env.GEMINI_API_KEY || "",
    noAiMode:  true, // Si es true, NO se harán llamadas a Gemini. 
  },
}