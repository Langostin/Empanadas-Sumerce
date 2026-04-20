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
const { getSession, saveSession } = require("../bot/sessions")
const { MENUS }                   = require("../bot/menus")

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
              p.whatsapp, p.codigo_entrega_sistema, p.descuento, p.dato_fiscal_id,
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
    let xmlBuffer  = null
    let pdfNombre  = `ticket-${pedido.folio}.pdf`
    let pdfCaption = "🧾 Aquí está tu ticket de compra, parcero. ¡Guárdalo!"
    let xmlNombre  = `factura-${pedido.folio}.xml`

    let qr_codigo = pedido.qr_codigo;
    let qr_generado = pedido.qr_generado;

    if (pedido.requiere_factura && pedido.dato_fiscal_id && !qr_generado) {
       console.log(`Generando factura SAT (retrasada) para pedido ${pedidoId}...`)
       try {
         const f = await facturacion.generarFactura(pedidoId)
         qr_codigo = f.cfdiId
         qr_generado = true
       } catch (fe) {
         console.warn("⚠️ Error generando factura:", fe.message)
       }
    }

    if (pedido.requiere_factura && qr_generado && qr_codigo) {
      // Intentar descargar el PDF de la factura SAT desde Facturama
      try {
        pdfBuffer = await facturacion.descargarPDF(qr_codigo)
        xmlBuffer = await facturacion.descargarXML(qr_codigo)
        pdfNombre  = `factura-${pedido.folio}.pdf`
        pdfCaption = "🧾 *Aquí está tu factura fiscal (CFDI 4.0)*, parcero. ¡Guárdala!"
        console.log(`✅ PDF factura listo para pedido ${pedidoId}`)
      } catch (fe) {
        console.warn(`⚠️ No se pudo descargar PDF/XML de Facturama: ${fe.message}. Generando ticket local.`)
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
      await _esperar(800)
    }

    // Enviar el XML si lo hay
    if (xmlBuffer) {
      await _sock.sendMessage(jid, {
        document: xmlBuffer,
        mimetype: "application/xml",
        fileName: xmlNombre,
        caption:  "🗂️ Factura en formato XML",
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
//  FACTURA EXITOSA
// ══════════════════════════════════════════════════════════════════

/**
 * Notifica al cliente que su factura fue generada correctamente
 * y adjunta el PDF y XML.
 *
 * @param {number} pedidoId
 * @param {object} facturaData - { uuid, cfdiId, folio, total, rfc }
 */
async function notificarFacturaExitosa(pedidoId, facturaData) {
  if (!_sock) {
    console.warn("⚠️ notificaciones: socket no inicializado, se omite mensaje de factura")
    return
  }

  try {
    // ── Datos del pedido ──────────────────────────────────────
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
      console.error(`❌ notificarFacturaExitosa: pedido ${pedidoId} no encontrado`)
      return
    }

    const jid    = pedido.whatsapp
    const nombre = pedido.cliente_nombre || "parcero"

    // ── Mensaje de texto con detalles de la factura ───────────
    let msg =
      `🧾 *¡Tu factura está lista!* ✅\n\n` +
      `*Nombre:* ${nombre}\n` +
      `*Folio:* ${facturaData.folio || pedido.folio}\n` +
      `*Total:* $${Number(facturaData.total || pedido.total).toFixed(2)} MXN\n` +
      `*RFC:* ${facturaData.rfc || "N/A"}\n`

    if (facturaData.uuid) {
      msg += `*UUID:* \`${facturaData.uuid}\`\n`
    }

    msg +=
      `\n📎 Te estoy enviando los documentos fiscales:\n` +
      `• 📄 PDF de la factura (CFDI 4.0)\n` +
      `• 🗂️ XML para trámites\n\n` +
      `_¡Guarda estos documentos en un lugar seguro!_`

    await _sock.sendMessage(jid, { text: msg })
    await _esperar(800)

    // ── Enviar PDF ────────────────────────────────────────────
    try {
      const pdfBuffer = await facturacion.descargarPDF(facturaData.cfdiId)
      await _sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: "application/pdf",
        fileName: `factura-${facturaData.folio || pedidoId}.pdf`,
        caption:  "📄 Factura CFDI 4.0 en PDF",
      })
      await _esperar(800)
      console.log(`✅ PDF factura enviado → ${jid} (pedido ${pedidoId})`)
    } catch (pdfErr) {
      console.error(`❌ Error enviando PDF: ${pdfErr.message}`)
    }

    // ── Enviar XML ────────────────────────────────────────────
    try {
      const xmlBuffer = await facturacion.descargarXML(facturaData.cfdiId)
      await _sock.sendMessage(jid, {
        document: xmlBuffer,
        mimetype: "application/xml",
        fileName: `factura-${facturaData.folio || pedidoId}.xml`,
        caption:  "🗂️ Factura en formato XML",
      })
      console.log(`✅ XML factura enviado → ${jid} (pedido ${pedidoId})`)
    } catch (xmlErr) {
      console.error(`❌ Error enviando XML: ${xmlErr.message}`)
    }

    console.log(`📱 Notificación factura exitosa enviada → ${jid} (pedido ${pedidoId})`)

  } catch (err) {
    console.error(`❌ notificarFacturaExitosa error (pedido ${pedidoId}):`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════
//  ERROR EN FACTURA
// ══════════════════════════════════════════════════════════════════

/**
 * Notifica al cliente que hubo un error al generar la factura
 * y lo instruye a pasar por sucursal.
 *
 * @param {number} pedidoId
 * @param {string} errorMsg - mensaje de error para logging
 */
async function notificarErrorFactura(pedidoId, errorMsg) {
  if (!_sock) {
    console.warn("⚠️ notificaciones: socket no inicializado, se omite mensaje de error")
    return
  }

  try {
    // ── Datos del pedido ──────────────────────────────────────
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
      console.error(`❌ notificarErrorFactura: pedido ${pedidoId} no encontrado`)
      return
    }

    const jid    = pedido.whatsapp
    const nombre = pedido.cliente_nombre || "parcero"

    // ── Mensaje de error ──────────────────────────────────────
    const msg =
      `⚠️ *¡Hubo un problema con tu factura!* 😞\n\n` +
      `*Pedido:* ${pedido.folio}\n` +
      `*Total:* $${Number(pedido.total).toFixed(2)} MXN\n\n` +
      `No pudimos generar tu factura fiscal en este momento.\n\n` +
      `*Por favor, ${nombre}:*\n` +
      `1️⃣ Dirígete a nuestra *sucursal*\n` +
      `2️⃣ Presenta tu código de pedido: \`${pedido.folio}\`\n` +
      `3️⃣ Nuestro equipo te generará la factura en el acto\n\n` +
      `🤝 Disculpa las molestias. ¡Estamos aquí para ayudarte!\n\n` +
      `_Si tienes dudas, escríbenos 👇_`

    await _sock.sendMessage(jid, { text: msg })
    console.log(`📱 Notificación error factura enviada → ${jid} (pedido ${pedidoId})`)

    // ── Log del error ─────────────────────────────────────────
    await query(
      `INSERT INTO LogSistema (nivel, modulo, accion, pedido_id, detalle)
       VALUES (@nivel, @modulo, @accion, @pid, @det)`,
      {
        nivel: "ERROR",
        modulo: "facturacion_whatsapp",
        accion: "error_factura_notificado",
        pid: pedidoId,
        det: errorMsg,
      }
    ).catch(err => console.error("⚠️ Error logging:", err.message))

  } catch (err) {
    console.error(`❌ notificarErrorFactura error (pedido ${pedidoId}):`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════
//  ENTREGA DE PEDIDO Y CALIFICACIÓN
// ══════════════════════════════════════════════════════════════════

/**
 * Notifica que el pedido fue entregado, envía comprobante si fue en efectivo,
 * y solicita calificación del tiempo de entrega.
 *
 * @param {number} pedidoId
 * @param {boolean} esEfectivo
 */
async function notificarEntrega(pedidoId, esEfectivo) {
  if (!_sock) {
    console.warn("⚠️ notificaciones: socket no inicializado, se omite notificar entrega")
    return
  }

  try {
    const res = await query(
      `SELECT p.folio, p.whatsapp, p.requiere_factura, p.qr_codigo, p.qr_generado, p.dato_fiscal_id,
              c.nombre AS cliente_nombre
       FROM Pedido p
       JOIN Cliente c ON p.whatsapp = c.whatsapp
       WHERE p.pedido_id = @pid`,
      { pid: pedidoId }
    )
    const pedido = res.recordset[0]
    if (!pedido) return

    const jid = pedido.whatsapp
    const nombre = pedido.cliente_nombre || "parcero"

    if (esEfectivo) {
      // Mensaje de entrega con documentos
      let msg = `📦 *¡Pedido entregado, ${nombre}!* 🇨🇴\n\nTu pedido *${pedido.folio}* ha sido entregado exitosamente.\n\n`
      let conFacturaLabel = "aquí está tu ticket"
      if (pedido.requiere_factura) {
        conFacturaLabel = "aquí está tu ticket y tu factura fiscal"
      }
      msg += `🧾 ${conFacturaLabel}.`
      
      await _sock.sendMessage(jid, { text: msg })
      await _esperar(800)

      // === GENERAR Y ENVIAR TICKET SIEMPRE (ES EFECTIVO) ===
      try {
        const ticketBuffer = await generarTicket(pedidoId)
        await _sock.sendMessage(jid, {
          document: ticketBuffer,
          mimetype: "application/pdf",
          fileName: `ticket-${pedido.folio}.pdf`,
          caption: "🧾 Tu ticket de compra",
        })
        await _esperar(800)
      } catch (e) {
        console.error("❌ Error generando/enviando ticket en entrega:", e.message)
      }

      // === GENERAR Y ENVIAR FACTURA SI LA PIDIÓ ===
      let qr_codigo = pedido.qr_codigo;
      let qr_generado = pedido.qr_generado;

      if (pedido.requiere_factura && pedido.dato_fiscal_id && !qr_generado) {
        console.log(`Generando factura SAT (retrasada) para pedido ${pedidoId}...`)
        try {
          const f = await facturacion.generarFactura(pedidoId)
          qr_codigo = f.cfdiId
          qr_generado = true
        } catch (fe) {
          console.warn("⚠️ Error generando factura al entregar:", fe.message)
        }
      }

      if (pedido.requiere_factura && qr_generado && qr_codigo) {
        try {
          const pdfBuffer = await facturacion.descargarPDF(qr_codigo)
          await _sock.sendMessage(jid, {
            document: pdfBuffer,
            mimetype: "application/pdf",
            fileName: `factura-${pedido.folio}.pdf`,
            caption: "📄 Factura Fiscal (CFDI 4.0)",
          })
          await _esperar(800)
          
          const xmlBuffer = await facturacion.descargarXML(qr_codigo)
          await _sock.sendMessage(jid, {
            document: xmlBuffer,
            mimetype: "application/xml",
            fileName: `factura-${pedido.folio}.xml`,
            caption: "🗂️ Factura XML",
          })
          await _esperar(800)
        } catch (e) {
          console.warn(`⚠️ Error enviando documentos de factura: ${e.message}`)
        }
      }

    } else {
      // Tarjeta o transferencia, solo mensaje
      let msg = `📦 *¡Pedido entregado, ${nombre}!* 🇨🇴\n\nTu pedido *${pedido.folio}* ha sido entregado exitosamente.\n_(Tus recibos ya te fueron enviados al momento de confirmar el código de pago)_`
      await _sock.sendMessage(jid, { text: msg })
      await _esperar(800)
    }

    // Cambiar estado de la sesión para iniciar la evaluación
    const session = await getSession(jid)
    session.step = "calificar_tiempo"
    session.data.pedidoId = pedidoId
    await saveSession(jid, session)

    // Enviar el menú de calificación por tiempo
    await MENUS.calificacion(_sock, jid, "tiempo")
    console.log(`📱 Notificación de entrega enviada, solicitando calificacion a → ${jid}`)

  } catch (err) {
    console.error(`❌ Error en notificarEntrega:`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════
//  HELPER PRIVADO
// ══════════════════════════════════════════════════════════════════
function _esperar(ms) {
  return new Promise(r => setTimeout(r, ms))
}

module.exports = { 
  setSock, 
  notificarPagoExitoso, 
  notificarPagoFallido, 
  notificarFacturaExitosa, 
  notificarErrorFactura,
  notificarEntrega
}