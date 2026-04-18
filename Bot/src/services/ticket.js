/**
 * ticket.js — Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * Genera un ticket de compra en PDF usando PDFKit completamente
 * en memoria (sin archivos temporales en disco).
 *
 * Corrección: se pasa { bufferPages: true } al constructor y se
 * usa el evento 'end' sobre el propio documento para recolectar
 * los chunks — evita el error ENOENT en Windows con archivos tmp.
 *
 * Instalación:
 *   npm install pdfkit
 * ─────────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit")
const { query }   = require("../db")

/**
 * Genera el PDF del ticket de compra para un pedido.
 * @param {number} pedidoId
 * @returns {Promise<Buffer>}
 */
async function generarTicket(pedidoId) {
  // ── 1. Obtener datos del pedido ──────────────────────────────
  const pedRes = await query(
    `SELECT p.pedido_id, p.folio, p.fecha_pedido, p.tipo_entrega,
            p.estado_pago, p.subtotal, p.iva, p.descuento, p.total,
            p.metodo_pago_id, p.codigo_entrega_sistema,
            mp.nombre AS metodo_pago_nombre,
            c.nombre  AS cliente_nombre,
            c.apellidos AS cliente_apellidos,
            dc.calle, dc.numero_exterior, dc.colonia
     FROM Pedido p
     JOIN Cliente c          ON p.whatsapp       = c.whatsapp
     JOIN MetodoPago mp       ON p.metodo_pago_id = mp.metodo_pago_id
     LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
     WHERE p.pedido_id = @pid`,
    { pid: pedidoId }
  )
  const pedido = pedRes.recordset[0]
  if (!pedido) throw new Error(`Pedido ${pedidoId} no encontrado`)

  // ── 2. Obtener líneas del detalle ────────────────────────────
  const detRes = await query(
    `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal AS subtotal_linea,
            pr.nombre AS producto
     FROM DetallePedido dp
     JOIN Producto pr ON dp.producto_id = pr.producto_id
     WHERE dp.pedido_id = @pid`,
    { pid: pedidoId }
  )
  const items = detRes.recordset

  // ── 3. Generar PDF completamente en memoria ──────────────────
  return new Promise((resolve, reject) => {
    // bufferPages: true → PDFKit acumula todo en RAM sin escribir a disco
    const doc = new PDFDocument({
      size:        [226, 700],  // ~80mm de ancho, altura generosa
      margin:      12,
      bufferPages: true,        // ← CLAVE: evita archivos temporales en Windows
      autoFirstPage: true,
    })

    const chunks = []
    doc.on("data",  chunk => chunks.push(chunk))
    doc.on("end",   ()    => resolve(Buffer.concat(chunks)))
    doc.on("error", err   => reject(err))

    // ── Constantes de layout ─────────────────────────────────
    const W         = 226
    const MARGIN    = 12
    const COL_RIGHT = W - MARGIN

    const NARANJA = "#e65c00"
    const GRIS    = "#777777"
    const NEGRO   = "#111111"
    const BORDE   = "#cccccc"

    // ── Helper: separador horizontal ─────────────────────────
    function sep(yPos, color = BORDE, grosor = 0.5) {
      doc.save()
          .moveTo(MARGIN, yPos)
          .lineTo(W - MARGIN, yPos)
          .strokeColor(color)
          .lineWidth(grosor)
          .stroke()
          .restore()
      return yPos + 7
    }

    // ── Helper: texto en dos columnas ─────────────────────────
    function fila2col(izq, der, yPos, { fontIzq = "Helvetica", fontDer = "Helvetica",
      sizeIzq = 8, sizeDer = 8, colorIzq = NEGRO, colorDer = NEGRO } = {}) {
      doc.font(fontIzq).fontSize(sizeIzq).fillColor(colorIzq)
         .text(izq, MARGIN, yPos, { width: 140, lineBreak: false })
      doc.font(fontDer).fontSize(sizeDer).fillColor(colorDer)
         .text(der, MARGIN, yPos, { width: W - MARGIN * 2, align: "right", lineBreak: false })
    }

    let y = 14

    // ════════════════════════════════════════════════════════
    //  ENCABEZADO
    // ════════════════════════════════════════════════════════
    doc.font("Helvetica-Bold").fontSize(13).fillColor(NARANJA)
       .text("Empanadas Sumercé", 0, y, { align: "center", width: W })
    y += 17

    doc.font("Helvetica").fontSize(7).fillColor(GRIS)
       .text("Empanadas colombianas artesanales 🇨🇴", 0, y, { align: "center", width: W })
    y += 10
    doc.font("Helvetica").fontSize(7).fillColor(GRIS)
       .text("Ciudad Juárez, Chihuahua | +52 656 XXX XXXX", 0, y, { align: "center", width: W })
    y += 14

    y = sep(y, NARANJA, 1)

    // ════════════════════════════════════════════════════════
    //  FOLIO Y FECHA
    // ════════════════════════════════════════════════════════
    const fechaStr = new Date(pedido.fecha_pedido).toLocaleString("es-MX", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

    doc.font("Helvetica-Bold").fontSize(9).fillColor(NEGRO)
       .text(pedido.folio, MARGIN, y)
    doc.font("Helvetica").fontSize(7).fillColor(GRIS)
       .text(fechaStr, 0, y, { align: "right", width: W - MARGIN })
    y += 14

    // Tipo de entrega
    const entregaLabel = pedido.tipo_entrega === "domicilio"
      ? "A domicilio"
      : "Recoger en tienda"
    doc.font("Helvetica").fontSize(7.5).fillColor(NEGRO)
       .text(`Entrega: ${entregaLabel}`, MARGIN, y)
    y += 11

    // Dirección (si aplica)
    if (pedido.tipo_entrega === "domicilio" && pedido.calle) {
      const dir = [pedido.calle, pedido.numero_exterior, pedido.colonia]
        .filter(Boolean).join(", ")
      doc.font("Helvetica").fontSize(7).fillColor(GRIS)
         .text(dir, MARGIN, y, { width: W - MARGIN * 2 })
      y += 10
    }

    // Cliente
    const nombreCliente = [pedido.cliente_nombre, pedido.cliente_apellidos]
      .filter(Boolean).join(" ")
    if (nombreCliente) {
      doc.font("Helvetica").fontSize(7.5).fillColor(NEGRO)
         .text(`Cliente: ${nombreCliente}`, MARGIN, y)
      y += 11
    }

    y += 2
    y = sep(y)

    // ════════════════════════════════════════════════════════
    //  CABECERA DE TABLA
    // ════════════════════════════════════════════════════════
    doc.font("Helvetica-Bold").fontSize(7).fillColor(GRIS)
    doc.text("PRODUCTO",   MARGIN,  y, { width: 100, lineBreak: false })
    doc.text("QTY",        MARGIN + 100, y, { width: 25, align: "center", lineBreak: false })
    doc.text("P.U.",       MARGIN + 130, y, { width: 35, align: "right", lineBreak: false })
    doc.text("TOTAL",      COL_RIGHT,    y, { align: "right", lineBreak: false, width: W - MARGIN * 2 })
    y += 11
    y = sep(y)

    // ════════════════════════════════════════════════════════
    //  LÍNEAS DE PRODUCTOS
    // ════════════════════════════════════════════════════════
    doc.font("Helvetica").fontSize(8).fillColor(NEGRO)
    for (const item of items) {
      const subtL = `$${Number(item.subtotal_linea).toFixed(2)}`
      const puL   = `$${Number(item.precio_unitario).toFixed(2)}`

      doc.text(item.producto,          MARGIN,       y, { width: 100, lineBreak: false })
      doc.text(String(item.cantidad),  MARGIN + 100, y, { width: 25,  align: "center", lineBreak: false })
      doc.text(puL,                    MARGIN + 130, y, { width: 35,  align: "right",  lineBreak: false })
      doc.text(subtL,                  COL_RIGHT,    y, { align: "right", lineBreak: false, width: W - MARGIN * 2 })
      y += 12
    }

    y = sep(y)

    // ════════════════════════════════════════════════════════
    //  TOTALES
    // ════════════════════════════════════════════════════════
    function filaTotal(label, valor, bold = false, colorVal = NEGRO) {
      fila2col(label, valor, y, {
        fontIzq: bold ? "Helvetica-Bold" : "Helvetica",
        fontDer: bold ? "Helvetica-Bold" : "Helvetica",
        sizeIzq: bold ? 9 : 8,
        sizeDer: bold ? 9 : 8,
        colorIzq: bold ? NARANJA : GRIS,
        colorDer: colorVal,
      })
      y += bold ? 13 : 11
    }

    filaTotal("Subtotal",   `$${Number(pedido.subtotal).toFixed(2)}`)
    if (Number(pedido.iva) > 0)
      filaTotal("IVA (16%)", `$${Number(pedido.iva).toFixed(2)}`)
    if (Number(pedido.descuento) > 0)
      filaTotal("Descuento", `-$${Number(pedido.descuento).toFixed(2)}`, false, "#27ae60")

    y = sep(y, NARANJA, 1)
    filaTotal("TOTAL", `$${Number(pedido.total).toFixed(2)} MXN`, true, NARANJA)
    y += 2

    // Método de pago
    doc.font("Helvetica").fontSize(7.5).fillColor(GRIS)
       .text(`Forma de pago: ${pedido.metodo_pago_nombre}`, MARGIN, y)
    y += 12

    // ════════════════════════════════════════════════════════
    //  CÓDIGO DE ENTREGA
    // ════════════════════════════════════════════════════════
    if (pedido.codigo_entrega_sistema) {
      y = sep(y)
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NEGRO)
         .text("CODIGO DE ENTREGA:", 0, y, { align: "center", width: W })
      y += 12
      doc.font("Courier-Bold").fontSize(20).fillColor(NARANJA)
         .text(pedido.codigo_entrega_sistema, 0, y, { align: "center", width: W })
      y += 26
      doc.font("Helvetica").fontSize(6.5).fillColor(GRIS)
         .text("Presentalo al recibir tu pedido", 0, y, { align: "center", width: W })
      y += 12
    }

    y = sep(y, NARANJA, 1)

    // ════════════════════════════════════════════════════════
    //  MENSAJE COLOMBIANO
    // ════════════════════════════════════════════════════════
    const mensajes = [
      "Gracias parcero, que chimba tenerlo de cliente!",
      "A la orden mi amor, vuelva pronto!",
      "Que bacano que nos eligio hoy! Buen provecho!",
    ]
    const msg = mensajes[pedidoId % mensajes.length]
    doc.font("Helvetica-Oblique").fontSize(7.5).fillColor(GRIS)
       .text(msg, 0, y + 4, { align: "center", width: W })
    y += 18

    doc.font("Helvetica").fontSize(6).fillColor(BORDE)
       .text("Este ticket no es comprobante fiscal.", 0, y, { align: "center", width: W })

    // Finalizar — flushPages() + end() necesarios con bufferPages: true
    doc.flushPages()
    doc.end()
  })
}

module.exports = { generarTicket }