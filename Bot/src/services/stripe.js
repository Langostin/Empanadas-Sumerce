/**
 * stripe.js — Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * El webhook ahora llama a notificaciones.js para enviar mensajes
 * de WhatsApp al cliente según el resultado del pago.
 * ─────────────────────────────────────────────────────────────────
 */

const Stripe = require("stripe")
const cfg    = require("../../config")
const { query } = require("../db")

const stripe   = Stripe(cfg.stripe.secretKey, { apiVersion: "2024-06-20" })
const BASE_URL = cfg.baseUrl

// Import lazy para evitar dependencias circulares
let _notif = null
function getNotif() {
  if (!_notif) _notif = require("./notificaciones")
  return _notif
}

// ══════════════════════════════════════════════════════════════════
//  1. CREAR LINK / SESIÓN DE PAGO
// ══════════════════════════════════════════════════════════════════
async function crearLinkPago({ pedidoId, folio, monto, metodoPagoId, whatsapp, descripcion }) {
  const montoCentavos = Math.round(monto * 100)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode:     "payment",
    currency: "mxn",
    line_items: [{
      price_data: {
        currency:   "mxn",
        unit_amount: montoCentavos,
        product_data: {
          name:        `Pedido ${folio} — Empanadas Sumercé 🇨🇴`,
          description: descripcion || "Empanadas colombianas artesanales",
        },
      },
      quantity: 1,
    }],
    metadata: { pedido_id: String(pedidoId), folio, whatsapp },
    success_url: `${BASE_URL}/pago/exito?session_id={CHECKOUT_SESSION_ID}&pedido=${pedidoId}`,
    cancel_url:  `${BASE_URL}/pago/cancelado?pedido=${pedidoId}`,
    expires_at:  Math.floor(Date.now() / 1000) + 30 * 60,
    ...(whatsapp ? { client_reference_id: whatsapp } : {}),
  })

  const res = await query(
    `INSERT INTO PagoPasarela
       (pedido_id, metodo_pago_id, monto, referencia_externa, url_pago, estado)
     OUTPUT INSERTED.pago_id
     VALUES (@pid, @mp, @monto, @ref, @url, 'pendiente')`,
    { pid: pedidoId, mp: metodoPagoId || 2, monto, ref: session.id, url: session.url }
  )
  const pagoId = res.recordset[0].pago_id

  await _log("INFO", "stripe", "checkout_session_creada", {
    pedidoId, detalle: { session_id: session.id, monto, folio },
  })

  return { pagoId, checkoutUrl: session.url, sessionId: session.id }
}

// ══════════════════════════════════════════════════════════════════
//  2. CONFIRMAR PAGO (post-redirect)
// ══════════════════════════════════════════════════════════════════
async function confirmarPago(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  })

  const estado   = session.payment_status
  const pedidoId = parseInt(session.metadata?.pedido_id)
  const pi       = session.payment_intent
  const piId     = typeof pi === "string" ? pi : pi?.id
  const comision = pi?.application_fee_amount ? pi.application_fee_amount / 100 : null

  if (estado === "paid") {
    await _procesarPagoAprobado({ sessionId, pedidoId, referenciaExterna: piId, comision })
    // Notificar por WhatsApp (no bloquea la respuesta HTTP)
    getNotif().notificarPagoExitoso(pedidoId).catch(e =>
      console.error("❌ notificarPagoExitoso:", e.message)
    )
    return { ok: true, estado: "pagado", pedidoId, monto: session.amount_total / 100 }
  }

  return { ok: false, estado, pedidoId, monto: session.amount_total / 100 }
}

// ══════════════════════════════════════════════════════════════════
//  3. WEBHOOK
// ══════════════════════════════════════════════════════════════════
async function manejarWebhook(rawBody, signature) {
  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody, signature,
      cfg.stripe.webhookSecret || "whsec_PON_TU_SECRET_AQUI"
    )
  } catch (err) {
    console.error("❌ Webhook firma inválida:", err.message)
    return { ok: false, error: "firma_invalida" }
  }

  console.log(`🔔 Webhook Stripe: ${event.type}`)

  switch (event.type) {

    case "checkout.session.completed": {
      const s = event.data.object
      if (s.payment_status !== "paid") break
      const pedidoId = parseInt(s.metadata?.pedido_id)
      const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id
      await _procesarPagoAprobado({ sessionId: s.id, pedidoId, referenciaExterna: piId, comision: null })
      getNotif().notificarPagoExitoso(pedidoId).catch(e =>
        console.error("❌ notificarPagoExitoso:", e.message)
      )
      break
    }

    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object
      const pedidoId = parseInt(s.metadata?.pedido_id)
      const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id
      await _procesarPagoAprobado({ sessionId: s.id, pedidoId, referenciaExterna: piId, comision: null })
      getNotif().notificarPagoExitoso(pedidoId).catch(e =>
        console.error("❌ notificarPagoExitoso:", e.message)
      )
      break
    }

    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed": {
      const obj      = event.data.object
      const pedidoId = parseInt(obj.metadata?.pedido_id) || null
      if (pedidoId) {
        await query(`UPDATE PagoPasarela SET estado='rechazado' WHERE referencia_externa=@ref`, { ref: obj.id })
        await query(`UPDATE Pedido SET estado_pago='fallido' WHERE pedido_id=@pid`, { pid: pedidoId })
        await _log("WARN", "stripe", "pago_fallido", { pedidoId, detalle: { session_id: obj.id } })
        getNotif().notificarPagoFallido(pedidoId).catch(e =>
          console.error("❌ notificarPagoFallido:", e.message)
        )
      }
      break
    }

    case "charge.refunded": {
      const charge = event.data.object
      await query(`UPDATE PagoPasarela SET estado='reembolsado' WHERE referencia_externa=@ref`, { ref: charge.payment_intent })
      const r = await query(`SELECT pedido_id FROM PagoPasarela WHERE referencia_externa=@ref`, { ref: charge.payment_intent })
      const pedidoId = r.recordset[0]?.pedido_id
      if (pedidoId) {
        await query(`UPDATE Pedido SET estado_pago='reembolsado', estado_pedido='cancelado' WHERE pedido_id=@pid`, { pid: pedidoId })
        await _log("INFO", "stripe", "pago_reembolsado", { pedidoId })
      }
      break
    }

    default:
      console.log(`   ↳ Evento ignorado: ${event.type}`)
  }

  return { ok: true, evento: event.type }
}

// ══════════════════════════════════════════════════════════════════
//  4. REEMBOLSAR PAGO
// ══════════════════════════════════════════════════════════════════
async function reembolsarPago(pedidoId, monto = null, motivo = "requested_by_customer") {
  const r = await query(
    `SELECT referencia_externa, monto FROM PagoPasarela
     WHERE pedido_id=@pid AND estado='aprobado' ORDER BY fecha_confirmacion DESC`,
    { pid: pedidoId }
  )
  const pago = r.recordset[0]
  if (!pago) throw new Error(`No se encontró pago aprobado para pedido ${pedidoId}`)
  const params = { payment_intent: pago.referencia_externa, reason: motivo }
  if (monto !== null) params.amount = Math.round(monto * 100)
  const refund = await stripe.refunds.create(params)
  const montoR = refund.amount / 100
  await query(`UPDATE PagoPasarela SET estado='reembolsado' WHERE pedido_id=@pid AND estado='aprobado'`, { pid: pedidoId })
  await query(`UPDATE Pedido SET estado_pago='reembolsado', estado_pedido='cancelado' WHERE pedido_id=@pid`, { pid: pedidoId })
  await _log("INFO", "stripe", "reembolso_creado", { pedidoId, detalle: { refund_id: refund.id, monto: montoR } })
  return { ok: true, refundId: refund.id, monto: montoR }
}

// ══════════════════════════════════════════════════════════════════
//  5. CONSULTAR ESTADO
// ══════════════════════════════════════════════════════════════════
async function obtenerEstadoPago(pedidoId) {
  const r = await query(
    `SELECT referencia_externa, monto, estado FROM PagoPasarela
     WHERE pedido_id=@pid ORDER BY fecha_creacion DESC`,
    { pid: pedidoId }
  )
  const pago = r.recordset[0]
  if (!pago) return { estado: "sin_registro", monto: 0, moneda: "mxn" }
  if (pago.estado === "aprobado" || pago.estado === "reembolsado")
    return { estado: pago.estado, monto: pago.monto, moneda: "mxn", fuente: "base_de_datos" }
  try {
    const session = await stripe.checkout.sessions.retrieve(pago.referencia_externa)
    return {
      estado: session.payment_status, monto: session.amount_total / 100,
      moneda: session.currency, fuente: "stripe",
      expira: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      url: session.url,
    }
  } catch {
    return { estado: pago.estado, monto: pago.monto, moneda: "mxn", fuente: "base_de_datos" }
  }
}

// ──────────────────────────────────────────────────────────────────
//  PRIVADO
// ──────────────────────────────────────────────────────────────────
async function _procesarPagoAprobado({ sessionId, pedidoId, referenciaExterna, comision }) {
  await query(
    `UPDATE PagoPasarela
     SET estado='aprobado',
         referencia_externa  = ISNULL(@pi, referencia_externa),
         comision_pasarela   = @comision,
         fecha_confirmacion  = GETDATE()
     WHERE referencia_externa = @sid OR referencia_externa = @pi`,
    { sid: sessionId, pi: referenciaExterna || null, comision: comision || null }
  )
  await query(
    `UPDATE Pedido SET estado_pago='pagado', referencia_pago=@ref,
         fecha_confirmacion=GETDATE(), estado_pedido='en_cocina'
     WHERE pedido_id=@pid`,
    { pid: pedidoId, ref: referenciaExterna || sessionId }
  )
  await query(
    `UPDATE EstadoCocina SET estado='pendiente', fecha_inicio=GETDATE() WHERE pedido_id=@pid`,
    { pid: pedidoId }
  )
  await _log("INFO", "stripe", "pago_aprobado", {
    pedidoId, detalle: { session_id: sessionId, payment_intent: referenciaExterna },
  })
  console.log(`✅ Pago aprobado — pedido ${pedidoId} | PI: ${referenciaExterna}`)
}

async function _log(nivel, modulo, accion, { whatsapp, empleadoId, pedidoId, detalle } = {}) {
  try {
    await query(
      `INSERT INTO LogSistema (nivel, modulo, accion, whatsapp, empleado_id, pedido_id, detalle)
       VALUES (@nivel, @modulo, @accion, @wa, @emp, @pid, @det)`,
      {
        nivel, modulo, accion,
        wa:  whatsapp   || null,
        emp: empleadoId || null,
        pid: pedidoId   || null,
        det: detalle ? JSON.stringify(detalle) : null,
      }
    )
  } catch (err) {
    console.error("⚠️ Error insertando log:", err.message)
  }
}

module.exports = { crearLinkPago, confirmarPago, manejarWebhook, reembolsarPago, obtenerEstadoPago, stripe }