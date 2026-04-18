/**
 * notificaciones.js — Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * Maneja las notificaciones de WhatsApp post-pago:
 *
 *   · notificarPagoExitoso()  → mensaje de confirmación + PDF adjunto
 *                               (factura SAT si la pidió, ticket si no)
 *   · notificarPagoFallido()  → mensaje + menú para cambiar a efectivo o cancelar
 *
 * Este módulo se importa en bot.js y se le inyecta el socket de Baileys.
 * El webhook de stripe.js llama a estas funciones cuando recibe el evento.
 *
 * Instalación extra:
 *   npm install pdfkit   (para ticket.js)
 * ─────────────────────────────────────────────────────────────────
 */

const { query }        = require("../db")
const { generarTicket } = require("./ticket")
const facturacion       = require("./facturacion")

// Socket global de Baileys — se inicializa desde bot.js con setSock()
let _sock = null

/**
 * Inyecta el socket de WhatsApp (llamar desde bot.js al arrancar).
 * Ejemplo en bot.js:
 *   const notif = require("./notificaciones")
 *   notif.setSock(sock)
 */
function setSock(sock) {
  _sock = sock
  console.log("📱 notificaciones.js: socket de WhatsApp listo")
}

// ══════════════════════════════════════════════════════════════════
//  PAGO EXITOSO
// ══════════════════════════════════════════════════════════════════

/**
 * Notifica al cliente que su pago fue aceptado y adjunta el PDF.
 * - Si el pedido requiere factura → adjunta el CFDI PDF (Facturama)
 * - Si no → genera y adjunta el ticket de compra (PDFKit)
 *
 * @param {number} pedidoId
 */
async function notificarPagoExitoso(pedidoId) {
  if (!_sock) {
    console.warn("⚠️ notificaciones: socket no inicializado, se omite mensaje")
    return
  }

  try {
    // ── Datos del pedido ──────────────────────────────────────
    const res = await query(
      `SELECT p.folio, p.total, p.requiere_factura, p.qr_codigo, p.qr_generado,
              p.whatsapp, p.codigo_entrega_sistema, p.descuento,
              c.nombre AS cliente_nombre
       FROM Pedido p
       JOIN Cliente c ON p.whatsapp = c.whatsapp
       WHERE p.pedido_id = @pid`,
      { pid: pedidoId }
    )
    const pedido = res.recordset[0]
    if (!pedido) {
      console.error(`❌ notificarPagoExitoso: pedido ${pedidoId} no encontrado`)
      return
    }

    const jid    = pedido.whatsapp
    const nombre = pedido.cliente_nombre || "parcero"

    // ── Mensaje de texto principal ────────────────────────────
    let msg =
      `✅ *¡Pago confirmado, ${nombre}!* 🎉🇨🇴\n\n` +
      `*Folio:* ${pedido.folio}\n` +
      `*Total pagado:* $${Number(pedido.total).toFixed(2)} MXN\n`

    if (Number(pedido.descuento) > 0)
      msg += `*Descuento aplicado:* -$${Number(pedido.descuento).toFixed(2)} MXN 🎁\n`

    msg +=
      `\n*Código de entrega:* \`${pedido.codigo_entrega_sistema}\`\n` +
      `_(Muéstraselo al repartidor al recibir tu pedido)_\n\n` +
      `🥟 ¡Ya estamos preparando tus empanadas! Te avisamos cuando estén listas.`

    await _sock.sendMessage(jid, { text: msg })
    await _esperar(800)

    // ── Adjuntar PDF ──────────────────────────────────────────
    let pdfBuffer  = null
    let pdfNombre  = `ticket-${pedido.folio}.pdf`
    let pdfCaption = "🧾 Aquí está tu ticket de compra, parcero. ¡Guárdalo!"

    if (pedido.requiere_factura && pedido.qr_generado && pedido.qr_codigo) {
      // Intentar descargar el PDF de la factura SAT desde Facturama
      try {
        pdfBuffer = await facturacion.descargarPDF(pedido.qr_codigo)
        pdfNombre  = `factura-${pedido.folio}.pdf`
        pdfCaption = "🧾 *Aquí está tu factura fiscal (CFDI 4.0)*, parcero. ¡Guárdala!"
        console.log(`✅ PDF factura listo para pedido ${pedidoId}`)
      } catch (fe) {
        console.warn(`⚠️ No se pudo descargar PDF de Facturama: ${fe.message}. Generando ticket local.`)
        // Fallback: ticket normal si Facturama falla
        pdfBuffer = await generarTicket(pedidoId)
      }
    } else {
      // Sin factura → ticket de compra
      try {
        pdfBuffer = await generarTicket(pedidoId)
        console.log(`✅ Ticket PDF listo para pedido ${pedidoId}`)
      } catch (te) {
        console.error(`❌ Error generando ticket: ${te.message}`)
      }
    }

    // Enviar el PDF como documento adjunto
    if (pdfBuffer) {
      await _sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: "application/pdf",
        fileName: pdfNombre,
        caption:  pdfCaption,
      })
    }

    console.log(`📱 Notificación pago exitoso enviada → ${jid} (pedido ${pedidoId})`)

  } catch (err) {
    console.error(`❌ notificarPagoExitoso error (pedido ${pedidoId}):`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════
//  PAGO FALLIDO
// ══════════════════════════════════════════════════════════════════

/**
 * Notifica al cliente que su pago falló y le da opciones:
 *   1. Pagar en efectivo (cambia método de pago del pedido)
 *   2. Cancelar el pedido
 *
 * El bot.js debe manejar las respuestas "1" y "2" en un nuevo step
 * "pago_fallido_opciones" de la máquina de estados.
 *
 * @param {number} pedidoId
 */
async function notificarPagoFallido(pedidoId) {
  if (!_sock) {
    console.warn("⚠️ notificaciones: socket no inicializado, se omite mensaje")
    return
  }

  try {
    const res = await query(
      `SELECT p.folio, p.total, p.whatsapp,
              c.nombre AS cliente_nombre
       FROM Pedido p
       JOIN Cliente c ON p.whatsapp = c.whatsapp
       WHERE p.pedido_id = @pid`,
      { pid: pedidoId }
    )
    const pedido = res.recordset[0]
    if (!pedido) {
      console.error(`❌ notificarPagoFallido: pedido ${pedidoId} no encontrado`)
      return
    }

    const jid    = pedido.whatsapp
    const nombre = pedido.cliente_nombre || "parcero"

    // Guardar en sesión que estamos esperando respuesta por pago fallido
    // (bot.js lo maneja en el case "pago_fallido_opciones")
    await query(
      `UPDATE Cliente
       SET sesion_estado    = 'pago_fallido_opciones',
           sesion_datos     = @datos,
           sesion_actualizada = GETDATE()
       WHERE whatsapp = @wa`,
      {
        wa:    jid,
        datos: JSON.stringify({ pedidoId, folio: pedido.folio, total: pedido.total }),
      }
    )

    const msg =
      `😔 *¡Ay juepucha ${nombre}, el pago no se procesó!*\n\n` +
      `*Pedido:* ${pedido.folio}\n` +
      `*Total:* $${Number(pedido.total).toFixed(2)} MXN\n\n` +
      `¿Qué quieres hacer, parcero?\n\n` +
      `*1.* 💵 Pagar en *efectivo* al recibir el pedido\n` +
      `*2.* ❌ *Cancelar* el pedido\n\n` +
      `_Escribe el número de tu opción:_`

    await _sock.sendMessage(jid, { text: msg })
    console.log(`📱 Notificación pago fallido enviada → ${jid} (pedido ${pedidoId})`)

  } catch (err) {
    console.error(`❌ notificarPagoFallido error (pedido ${pedidoId}):`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════
//  HELPER PRIVADO
// ══════════════════════════════════════════════════════════════════
function _esperar(ms) {
  return new Promise(r => setTimeout(r, ms))
}

module.exports = { setSock, notificarPagoExitoso, notificarPagoFallido }