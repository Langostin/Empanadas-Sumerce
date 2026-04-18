/**
 * index.js — Empanadas Sumercé 🇨🇴
 * Punto de entrada. Arranca Express y el bot de WhatsApp.
 *
 * Uso:
 *   node index.js
 */
const { startBot, iniciarExpress } = require("./src/bot")

iniciarExpress()
startBot()