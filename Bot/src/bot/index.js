/**
 * src/bot/index.js
 * Arranque del bot de WhatsApp, servidor Express y crons.
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const path   = require("path")
const fs     = require("fs")

const config  = require("../../config")
const { handleMessage }            = require("./handler")
const { sendText }                 = require("./frases")
const { MENUS }                    = require("./menus")
const { getSession, saveSession }  = require("./sessions")
const db      = require("../services/clienteRepo")
const notif   = require("../services/notificaciones")
const stripe  = require("../services/stripe")
const factura = require("../services/facturacion")

// ══════════════════════════════════════════════════════════════════
//  SERVIDOR EXPRESS
// ══════════════════════════════════════════════════════════════════
const express = require("express")
const app     = express()

// Webhook Stripe — body RAW obligatorio antes del json parser
app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"]
  try {
    const result = await stripe.manejarWebhook(req.body, sig)
    console.log("🔔 Webhook Stripe:", result.evento)
    res.json({ received: true })
  } catch (err) {
    console.error("❌ Webhook error:", err.message)
    res.status(400).json({ error: err.message })
  }
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Página intermedia de pago
app.get("/pago/checkout", (req, res) => {
  const htmlPath = path.join(__dirname, "../../pago_checkout.html")
  if (!fs.existsSync(htmlPath)) return res.status(404).send("<h2>pago_checkout.html no encontrado</h2>")
  const checkoutUrl = req.query.checkout_url || ""
  if (checkoutUrl && !checkoutUrl.startsWith("https://checkout.stripe.com/"))
    return res.status(400).send("<h2>URL inválida</h2>")
  res.sendFile(htmlPath)
})

// Pago exitoso
app.get("/pago/exito", async (req, res) => {
  const { session_id, pedido } = req.query
  if (!session_id) return res.status(400).send("Falta session_id")
  try {
    const resultado = await stripe.confirmarPago(session_id)
    let facturaHtml = ""
    if (resultado.ok) {
      const pedidoId = resultado.pedidoId || parseInt(pedido)
      try {
        const det = await db.getDetallePedido(pedidoId)
        if (det?.pedido?.requiere_factura && det?.pedido?.dato_fiscal_id && !det?.pedido?.qr_generado) {
          const f = await factura.generarFactura(pedidoId)
          facturaHtml = `<hr><p><strong>🧾 Factura generada</strong></p>
            <p style="font-family:monospace;background:#f5f5f5;padding:8px">UUID: ${f.uuid}</p>
            <p><a href="/factura/${pedidoId}/pdf">📄 PDF</a> &nbsp; <a href="/factura/${pedidoId}/xml">🗂 XML</a></p>`
        }
      } catch (fe) { console.warn("⚠️ Factura automática:", fe.message) }

      return res.send(`<!DOCTYPE html><html lang="es"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>¡Pago exitoso! — Empanadas Sumercé</title>
        <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#fff8f0}
        .card{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
        h1{color:#e65c00}p{color:#555;line-height:1.6}</style></head><body>
        <div class="card"><div style="font-size:64px">✅</div>
        <h1>¡Pago confirmado!</h1>
        <p>¡Gracias parcero! Su pedido #${resultado.pedidoId} ya está en preparación. 🇨🇴🥟</p>
        <p>Le avisamos por WhatsApp cuando esté listo.</p>${facturaHtml}</div></body></html>`)
    }
    res.send(`<h2>Pago pendiente</h2><p>Estado: ${resultado.estado}. Revise su WhatsApp en unos minutos.</p>`)
  } catch (err) {
    console.error("❌ Error confirmando pago:", err.message)
    res.status(500).send(`<h2>Error</h2><p>${err.message}</p><p>Contáctenos por WhatsApp.</p>`)
  }
})

// Pago cancelado
app.get("/pago/cancelado", (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Cancelado</title>
    <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#fff8f0}
    .card{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
    h1{color:#999}</style></head><body>
    <div class="card"><div style="font-size:64px">❌</div><h1>Pago cancelado</h1>
    <p>No se realizó ningún cargo. Escríbanos por WhatsApp para intentar de nuevo.</p></div></body></html>`)
})

// Descarga PDF factura
app.get("/factura/:pedidoId/pdf", async (req, res) => {
  const pedidoId = parseInt(req.params.pedidoId)
  try {
    const r = await db.query(`SELECT qr_codigo FROM Pedido WHERE pedido_id=@pid`, { pid: pedidoId })
    const cfdiId = r.recordset[0]?.qr_codigo
    if (!cfdiId) return res.status(404).json({ error: "No hay factura para este pedido" })
    const buf = await factura.descargarPDF(cfdiId)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="factura-${pedidoId}.pdf"`)
    res.send(buf)
  } catch (err) { res.status(404).json({ error: err.message }) }
})

// Descarga XML factura
app.get("/factura/:pedidoId/xml", async (req, res) => {
  const pedidoId = parseInt(req.params.pedidoId)
  try {
    const r = await db.query(`SELECT qr_codigo FROM Pedido WHERE pedido_id=@pid`, { pid: pedidoId })
    const cfdiId = r.recordset[0]?.qr_codigo
    if (!cfdiId) return res.status(404).json({ error: "No hay factura para este pedido" })
    const xml = await factura.descargarXML(cfdiId)
    res.setHeader("Content-Type", "application/xml")
    res.setHeader("Content-Disposition", `attachment; filename="cfdi-${pedidoId}.xml"`)
    res.send(xml)
  } catch (err) { res.status(404).json({ error: err.message }) }
})

function iniciarExpress() {
  app.listen(config.port, () => {
    console.log(`🌐 Express en puerto ${config.port}`)
    console.log(`   POST /webhook/stripe`)
    console.log(`   GET  /pago/checkout | /pago/exito | /pago/cancelado`)
    console.log(`   GET  /factura/:id/pdf | /factura/:id/xml`)
  })
}

// ══════════════════════════════════════════════════════════════════
//  CRON: solicitar opiniones post-entrega
// ══════════════════════════════════════════════════════════════════
async function solicitarOpinionesPendientes(sock) {
  try {
    const pendientes = await db.pedidosSinOpinion()
    for (const p of pendientes) {
      const session = await getSession(p.whatsapp)
      session.step = "calificar_producto"
      session.data.pedidoId = p.pedido_id
      await saveSession(p.whatsapp, session)
      await sendText(sock, p.whatsapp,
        `¡Ey ${p.nombre || "parcero"}! 👋🇨🇴\n¿Cómo estuvo su pedido *${p.folio}* de ayer?\n¡Dénos su opinión! 👇`)
      await MENUS.calificacion(sock, p.whatsapp, "producto")
      await db.marcarOpinionSolicitada(p.pedido_id)
    }
  } catch (err) { console.error("Error cron opiniones:", err.message) }
}

// ══════════════════════════════════════════════════════════════════
//  ARRANQUE DEL BOT
// ══════════════════════════════════════════════════════════════════
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version }          = await fetchLatestBaileysVersion()
  console.log("🚀 WA versión:", version)

  const sock = makeWASocket({
    version, auth: state, printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  })

  notif.setSock(sock)

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) { console.log("📱 Escanea el QR:"); qrcode.generate(qr, { small: true }) }
    if (connection === "open")  console.log("✅ Bot conectado a WhatsApp")
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) { console.log("🔄 Reconectando..."); startBot() }
      else console.log("🚪 Sesión cerrada. Borra auth/ y escanea de nuevo.")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    try { await handleMessage(sock, msg) }
    catch (err) { console.error("Error handleMessage:", err) }
  })

  // Cron: limpiar sesiones viejas cada 24h
  setInterval(async () => {
    try { await db.limpiarSesionesViejas(); console.log("🧹 Sesiones limpiadas") } catch {}
  }, 24 * 60 * 60 * 1000)

  // Cron: solicitar opiniones cada hora
  setInterval(() => solicitarOpinionesPendientes(sock), 60 * 60 * 1000)
}

module.exports = { startBot, iniciarExpress }