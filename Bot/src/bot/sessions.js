/**
 * src/bot/sessions.js
 * Gestión de sesiones en memoria + persistencia en BD.
 */
const db = require("../services/clienteRepo")

const sessions = new Map()

async function getSession(jid) {
  if (!sessions.has(jid)) {
    try {
      const s = await db.getSesion(jid)
      sessions.set(jid, { step: s.step, data: s.datos || {} })
    } catch {
      sessions.set(jid, { step: "inicio", data: {} })
    }
  }
  return sessions.get(jid)
}

async function saveSession(jid, session) {
  sessions.set(jid, session)
  db.guardarSesion(jid, session.step, session.data).catch(() => {})
}

async function resetSession(jid) {
  sessions.set(jid, { step: "inicio", data: {} })
  try { await db.guardarSesion(jid, "inicio", {}) } catch {}
}

module.exports = { getSession, saveSession, resetSession }