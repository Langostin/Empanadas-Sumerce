/**
 * facturacion.js — Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * Fix definitivo del error UsoCFDI:
 *
 *  · Se loguean los valores RAW que llegan del JOIN antes de usarlos
 *  · El régimen default cuando el JOIN devuelve null/vacío es "616"
 *  · resolverUsoCFDI() se llama con los valores ya normalizados
 *  · Si el régimen es "616" o desconocido → UsoCFDI siempre "S01"
 *  · FiscalRegime del receptor nunca se envía null a Facturama
 * ─────────────────────────────────────────────────────────────────
 */

const axios  = require("axios")
const cfg    = require("../../config")
const { query } = require("../db")

// ══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — lee todo desde config/index.js
// ══════════════════════════════════════════════════════════════════
const SANDBOX      = cfg.facturama.sandbox
const BASE_URL     = SANDBOX ? "https://apisandbox.facturama.mx" : "https://api.facturama.mx"
const AUTH_HEADER  = "Basic " + Buffer.from(`${cfg.facturama.user}:${cfg.facturama.password}`).toString("base64")

const EMISOR = {
  Rfc:          cfg.emisor.rfc,
  Name:         cfg.emisor.nombre,
  FiscalRegime: cfg.emisor.regimen,
  TaxZipCode:   cfg.emisor.lugarExpedicion,
}

console.log(`🧾 Facturama → ${SANDBOX ? "SANDBOX" : "PRODUCCIÓN"} | ${BASE_URL}`)

const http = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: AUTH_HEADER, "Content-Type": "application/json" },
  timeout: 30000,
})

// ══════════════════════════════════════════════════════════════════
//  CATÁLOGO SAT: UsoCFDI válidos por régimen fiscal (CFDI 4.0)
// ══════════════════════════════════════════════════════════════════
const USOS_POR_REGIMEN = {
  "601": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
  "603": ["G01","G02","G03","S01","CP01"],
  "605": ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","S01","CP01","CN01"],
  "606": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","S01","CP01"],
  "607": ["G01","G02","G03","S01","CP01"],
  "608": ["G01","G02","G03","S01","CP01"],
  "610": ["S01","CP01"],
  "611": ["G03","S01","CP01"],
  "612": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","S01","CP01"],
  "614": ["G01","G02","G03","S01","CP01"],
  "615": ["G03","S01","CP01"],
  "616": ["S01","CP01"],   // ← Sin obligaciones fiscales: SOLO S01 o CP01
  "620": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
  "621": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","S01","CP01"],
  "622": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
  "623": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
  "624": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
  "625": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","S01","CP01"],
  "626": ["G01","G02","G03","I01","I02","I03","I04","I05","I06","I07","I08","S01","CP01"],
}

/**
 * Devuelve un UsoCFDI garantizado compatible con el régimen.
 * Nunca devuelve un valor inválido para Facturama.
 */
function resolverUsoCFDI(regimenClave, usoPreferido) {
  // Normalizar: quitar espacios, nulls, undefined → string limpio
  const regimen = (regimenClave || "").toString().trim()
  const uso     = (usoPreferido  || "").toString().trim()

  const usosValidos = USOS_POR_REGIMEN[regimen]

  if (!usosValidos) {
    // Régimen desconocido o vacío → S01 es siempre seguro
    console.warn(`⚠️ [facturacion] Régimen "${regimen}" desconocido → S01`)
    return "S01"
  }

  if (uso && usosValidos.includes(uso)) {
    return uso   // compatible ✅
  }

  // Incompatible o vacío → S01 (está en TODOS los regímenes)
  console.warn(`⚠️ [facturacion] UsoCFDI "${uso}" incompatible con régimen "${regimen}" → S01`)
  return "S01"
}

// ──────────────────────────────────────────────────────────────────
//  Helpers de fecha y periodo
// ──────────────────────────────────────────────────────────────────
function fechaLocal() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 19)
}
function mesActual()  { return String(new Date().getMonth() + 1).padStart(2, "0") }
function anioActual() { return String(new Date().getFullYear()) }

// ══════════════════════════════════════════════════════════════════
//  1. GENERAR Y TIMBRAR CFDI 4.0
// ══════════════════════════════════════════════════════════════════
async function generarFactura(pedidoId) {

  // ── Query del pedido con todos los datos fiscales ─────────────
  const pedidoRes = await query(
    `SELECT p.pedido_id, p.folio, p.subtotal, p.iva, p.descuento, p.total,
            p.metodo_pago_id, p.requiere_factura, p.dato_fiscal_id,
            c.whatsapp,
            df.rfc, df.razon_social, df.codigo_postal,
            cu.clave  AS cfdi_uso_clave,
            rf.clave  AS regimen_clave
     FROM Pedido p
     JOIN  Cliente            c   ON p.whatsapp      = c.whatsapp
     LEFT JOIN DatoFiscalCliente df ON p.dato_fiscal_id = df.dato_fiscal_id
     LEFT JOIN CfdiUso        cu  ON df.cfdi_uso_id   = cu.cfdi_uso_id
     LEFT JOIN RegimenFiscal  rf  ON df.regimen_id    = rf.regimen_id
     WHERE p.pedido_id = @pid`,
    { pid: pedidoId }
  )

  const p = pedidoRes.recordset[0]
  if (!p)                  throw new Error(`Pedido ${pedidoId} no encontrado`)
  if (!p.rfc)              throw new Error(`El pedido ${pedidoId} no tiene datos fiscales`)
  if (!p.requiere_factura) throw new Error(`El pedido ${pedidoId} no requiere factura`)

  // ── Log de diagnóstico — valores RAW del JOIN ─────────────────
  console.log(`🧾 [facturacion] Pedido ${pedidoId} datos fiscales RAW:`, {
    rfc:            p.rfc,
    razon_social:   p.razon_social,
    cfdi_uso_clave: p.cfdi_uso_clave,   // puede ser null si no se eligió
    regimen_clave:  p.regimen_clave,    // puede ser null si no se eligió
    codigo_postal:  p.codigo_postal,
  })

  // ── Normalizar régimen y uso ANTES de construir el payload ────
  // Si el cliente no eligió régimen en el bot → default 616 (más común para personas físicas)
  const regimenFinal = (p.regimen_clave || "616").toString().trim()
  const usoFinal     = resolverUsoCFDI(regimenFinal, p.cfdi_uso_clave)
  const rfcReceptor  = p.rfc.toUpperCase().trim()
  const esPublicoGeneral = rfcReceptor === "XAXX010101000" || rfcReceptor === "XEXX010101000"

  console.log(`🧾 [facturacion] Receptor resuelto → RFC: ${rfcReceptor} | Régimen: ${regimenFinal} | UsoCFDI: ${usoFinal}`)

  // ── Detalle de productos ──────────────────────────────────────
  const detRes = await query(
    `SELECT dp.cantidad, dp.precio_unitario, dp.aplica_iva, dp.iva_monto,
            pr.nombre, pr.descripcion, pr.tasa_iva
     FROM DetallePedido dp
     JOIN  Producto pr ON dp.producto_id = pr.producto_id
     WHERE dp.pedido_id = @pid`,
    { pid: pedidoId }
  )
  const items = detRes.recordset
  if (!items.length) throw new Error(`El pedido ${pedidoId} no tiene productos`)

  // ── Construir Items CFDI ──────────────────────────────────────
  const cfdiItems = items.map(item => {
    const precioBase = Number(item.precio_unitario)
    const subtotal   = Number((precioBase * item.cantidad).toFixed(2))
    const tasaIva    = item.aplica_iva ? Number(item.tasa_iva) : 0
    const ivaMonto   = Number((subtotal * tasaIva).toFixed(2))
    const totalLinea = Number((subtotal + ivaMonto).toFixed(2))

    const cfdiItem = {
      ProductCode:   "90101501",
      Description:   item.nombre + (item.descripcion ? ` (${item.descripcion})` : ""),
      Unit:          "Pieza",
      UnitCode:      "H87",
      Quantity:      item.cantidad,
      UnitPrice:     precioBase,
      Subtotal:      subtotal,
      Discount:      0,
      TaxObject:     item.aplica_iva ? "02" : "01",
      Total:         totalLinea,
    }

    if (item.aplica_iva) {
      cfdiItem.Taxes = [{
        Total:       ivaMonto,
        Name:        "IVA",
        Base:        subtotal,
        Rate:        tasaIva,
        IsRetention: false,
      }]
    }

    return cfdiItem
  })

  // ── Totales ───────────────────────────────────────────────────
  const subtotalTotal = cfdiItems.reduce((s, i) => s + i.Subtotal, 0)
  const ivaTotal      = cfdiItems.reduce((s, i) => s + (i.Taxes?.[0]?.Total || 0), 0)
  const descuento     = Number(p.descuento) || 0
  const totalFinal    = Number((subtotalTotal + ivaTotal - descuento).toFixed(2))

  // ── Payload CFDI 4.0 ──────────────────────────────────────────
  const cfdiPayload = {
    Currency:        "MXN",
    ExpeditionPlace: EMISOR.TaxZipCode,
    PaymentForm:     _obtenerFormaPago(p.metodo_pago_id),
    PaymentMethod:   "PUE",
    CfdiType:        "I",
    NameId:          "1",
    Date:            fechaLocal(),

    Issuer: {
      Rfc:          EMISOR.Rfc,
      Name:         EMISOR.Name,
      FiscalRegime: EMISOR.FiscalRegime,
    },

    Receiver: {
      Rfc:          rfcReceptor,
      Name:         p.razon_social,
      CfdiUse:      usoFinal,        // ← siempre compatible, nunca null
      FiscalRegime: regimenFinal,    // ← siempre string válido, nunca null
      TaxZipCode:   (p.codigo_postal || EMISOR.TaxZipCode).toString().trim(),
    },

    Items: cfdiItems,
    ...(descuento > 0 ? { Discount: descuento } : {}),
  }

  // GlobalInformation: obligatorio para RFC público en general
  if (esPublicoGeneral) {
    cfdiPayload.GlobalInformation = {
      Periodicity: "01",
      Months:      mesActual(),
      Year:        anioActual(),
    }
  }

  // ── Log del payload completo para depuración ──────────────────
  console.log("🧾 [facturacion] Payload CFDI Receiver:", JSON.stringify(cfdiPayload.Receiver))

  // ── Llamar a Facturama ────────────────────────────────────────
  let facturaResp
  try {
    const resp = await http.post("/api/3/cfdis", cfdiPayload)
    facturaResp = resp.data
  } catch (err) {
    const errData = err.response?.data
    const errMsg  = errData?.ModelState
      ? JSON.stringify(errData.ModelState)
      : errData?.message || JSON.stringify(errData) || err.message
    await _log("ERROR", "facturacion", "error_timbrado", {
      pedidoId,
      detalle: `${errMsg} | Receiver: ${JSON.stringify(cfdiPayload.Receiver)}`,
    })
    throw new Error(`Error al timbrar (${SANDBOX ? "sandbox" : "prod"}): ${errMsg}`)
  }

  // ── Persistir UUID ────────────────────────────────────────────
  const uuid   = facturaResp.Complement?.TaxStamp?.Uuid || facturaResp.Id || null
  const cfdiId = facturaResp.Id

  await query(
    `UPDATE Pedido SET qr_codigo=@uuid, qr_generado=1 WHERE pedido_id=@pid`,
    { pid: pedidoId, uuid: uuid || cfdiId }
  )

  await _log("INFO", "facturacion", "cfdi_timbrado", {
    pedidoId,
    detalle: { uuid, cfdi_id: cfdiId, total: totalFinal, rfc: p.rfc, sandbox: SANDBOX },
  })

  if (SANDBOX) console.log(`🧾 [SANDBOX] UUID: ${uuid} (no válido fiscalmente)`)

  return {
    ok: true, uuid, cfdiId,
    folio:   facturaResp.Folio || null,
    total:   totalFinal,
    rfc:     p.rfc,
    sandbox: SANDBOX,
    pdfUrl:  `${BASE_URL}/cfdi/${cfdiId}/pdf`,
    xmlUrl:  `${BASE_URL}/cfdi/${cfdiId}/xml`,
  }
}

// ══════════════════════════════════════════════════════════════════
//  2. CONSULTAR FACTURA
// ══════════════════════════════════════════════════════════════════
async function consultarFactura(cfdiId) {
  try {
    const resp = await http.get(`/api/3/cfdis/${cfdiId}`)
    const d = resp.data
    return {
      estado:   d.Status                     || "desconocido",
      uuid:     d.Complement?.TaxStamp?.Uuid || null,
      total:    d.Total                       || 0,
      receptor: d.Receiver?.Name             || null,
      rfc:      d.Receiver?.Rfc              || null,
      fecha:    d.Date                        || null,
      folio:    d.Folio                       || null,
      sandbox:  SANDBOX,
    }
  } catch (err) {
    throw new Error(`Error consultando CFDI ${cfdiId}: ${err.response?.data?.message || err.message}`)
  }
}

// ══════════════════════════════════════════════════════════════════
//  3. CANCELAR FACTURA
// ══════════════════════════════════════════════════════════════════
async function cancelarFactura(cfdiId, motivo = "02", uuidRelacionado = null) {
  try {
    const params = new URLSearchParams({ motive: motivo })
    if (uuidRelacionado) params.append("uuidRelacionado", uuidRelacionado)
    const resp = await http.delete(`/api/3/cfdis/${cfdiId}?${params.toString()}`)
    await _log("INFO", "facturacion", "cfdi_cancelado", {
      detalle: { cfdi_id: cfdiId, motivo, status: resp.data?.Status },
    })
    return { ok: true, estado: resp.data?.Status || "cancelado" }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    await _log("ERROR", "facturacion", "error_cancelacion", { detalle: { cfdi_id: cfdiId, error: msg } })
    throw new Error(`Error cancelando CFDI: ${msg}`)
  }
}

// ══════════════════════════════════════════════════════════════════
//  4. DESCARGAR PDF
// ══════════════════════════════════════════════════════════════════
async function descargarPDF(cfdiId) {
  try {
    const pdfResp = await http.get(`/cfdi/pdf/issued/${cfdiId}`)
    return Buffer.from(pdfResp.data.Content, "base64")
  } catch (err) {
    throw new Error(`Error descargando PDF ${cfdiId}: ${err.response?.data?.message || err.message}`)
  }
}

// ══════════════════════════════════════════════════════════════════
//  5. DESCARGAR XML
// ══════════════════════════════════════════════════════════════════
async function descargarXML(cfdiId) {
  try {
    const xmlResp = await http.get(`/cfdi/xml/issued/${cfdiId}`)
    return Buffer.from(xmlResp.data.Content, "base64")
  } catch (err) {
    throw new Error(`Error descargando XML ${cfdiId}: ${err.response?.data?.message || err.message}`)
  }
}

// ──────────────────────────────────────────────────────────────────
//  PRIVADO
// ──────────────────────────────────────────────────────────────────
function _obtenerFormaPago(metodoPagoId) {
  return { 1: "01", 2: "28", 3: "04" }[metodoPagoId] || "01"
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
        det: detalle
          ? (typeof detalle === "string" ? detalle : JSON.stringify(detalle))
          : null,
      }
    )
  } catch (err) {
    console.error("⚠️ Error insertando log:", err.message)
  }
}

module.exports = {
  generarFactura, consultarFactura, cancelarFactura,
  descargarPDF, descargarXML, resolverUsoCFDI,
}