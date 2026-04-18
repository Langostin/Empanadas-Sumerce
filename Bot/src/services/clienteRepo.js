/**
 * src/services/clienteRepo.js
 * Repositorio de BD del cliente. Igual al original pero con paths actualizados.
 */
const { sql, query, exec, getPool } = require("../db")

// ══════════════════════════════════════════════════════════════════
//  1. CLIENTE
// ══════════════════════════════════════════════════════════════════
async function upsertCliente({ whatsapp, nombre, apellidos, genero, email }) {
  return exec("sp_UpsertCliente", { whatsapp, nombre, apellidos, genero, email })
}

async function getCliente(whatsapp) {
  const res = await query(
    `SELECT whatsapp, nombre, apellidos, genero, email,
            sesion_estado, sesion_datos, sesion_actualizada,
            total_pedidos, total_gastado, fecha_creacion, activo
     FROM Cliente WHERE whatsapp = @wa`,
    { wa: whatsapp }
  )
  return res.recordset[0] || null
}

async function guardarSesion(whatsapp, step, datosObj) {
  return exec("sp_GuardarSesionBot", { whatsapp, step, datos_json: JSON.stringify(datosObj) })
}

async function getSesion(whatsapp) {
  const res = await query(
    `SELECT sesion_estado, sesion_datos, sesion_actualizada FROM Cliente WHERE whatsapp = @wa`,
    { wa: whatsapp }
  )
  const row = res.recordset[0]
  if (!row) return { step: "inicio", datos: {} }
  return {
    step:  row.sesion_estado || "inicio",
    datos: row.sesion_datos ? JSON.parse(row.sesion_datos) : {},
  }
}

async function limpiarSesionesViejas() {
  return exec("sp_LimpiarSesionesViejas")
}

// ══════════════════════════════════════════════════════════════════
//  2. DIRECCIONES
// ══════════════════════════════════════════════════════════════════
async function agregarDireccion(whatsapp, { alias, calle, numeroExterior, numeroInterior,
  colonia, ciudad, estado, codigoPostal, latitud, longitud, esPredeterminada = false }) {
  if (esPredeterminada)
    await query(`UPDATE DireccionCliente SET es_predeterminada=0 WHERE whatsapp=@wa`, { wa: whatsapp })

  const res = await query(
    `INSERT INTO DireccionCliente
       (whatsapp,alias,calle,numero_exterior,numero_interior,
        colonia,ciudad,estado,codigo_postal,latitud,longitud,es_predeterminada)
     OUTPUT INSERTED.direccion_id
     VALUES (@wa,@alias,@calle,@ne,@ni,@col,@ciudad,@estado,@cp,@lat,@lng,@pred)`,
    {
      wa: whatsapp, alias, calle, ne: numeroExterior, ni: numeroInterior,
      col: colonia, ciudad: ciudad || "Ciudad Juárez", estado: estado || "Chihuahua",
      cp: codigoPostal, lat: latitud || null, lng: longitud || null,
      pred: esPredeterminada ? 1 : 0,
    }
  )
  return res.recordset[0].direccion_id
}

async function getDirecciones(whatsapp) {
  const res = await query(
    `SELECT direccion_id,alias,calle,numero_exterior,numero_interior,
            colonia,ciudad,estado,codigo_postal,latitud,longitud,es_predeterminada
     FROM DireccionCliente WHERE whatsapp=@wa AND activa=1
     ORDER BY es_predeterminada DESC, fecha_registro DESC`,
    { wa: whatsapp }
  )
  return res.recordset
}

// ══════════════════════════════════════════════════════════════════
//  3. DATOS FISCALES (acepta codigoPostal y regimenClave)
// ══════════════════════════════════════════════════════════════════
async function guardarDatoFiscal(whatsapp, { rfc, razonSocial, codigoPostal = null, regimenClave = "616", cfdiUsoId = null }) {
  await query(`UPDATE DatoFiscalCliente SET es_predeterminado=0 WHERE whatsapp=@wa`, { wa: whatsapp })

  // Resolver regimen_id por clave SAT
  const regimenRes = await query(
    `SELECT regimen_id FROM RegimenFiscal WHERE clave=@clave`,
    { clave: (regimenClave || "616").toString().trim() }
  )
  let regimenId = regimenRes.recordset[0]?.regimen_id || null
  if (!regimenId) {
    const fallback = await query(`SELECT regimen_id FROM RegimenFiscal WHERE clave='616'`)
    regimenId = fallback.recordset[0]?.regimen_id || null
    console.warn(`⚠️ [clienteRepo] Régimen "${regimenClave}" no encontrado, usando 616`)
  }

  const res = await query(
    `INSERT INTO DatoFiscalCliente
       (whatsapp,rfc,razon_social,codigo_postal,cfdi_uso_id,regimen_id,es_predeterminado)
     OUTPUT INSERTED.dato_fiscal_id
     VALUES (@wa,@rfc,@rs,@cp,@cfdi,@reg,1)`,
    { wa: whatsapp, rfc: rfc.toUpperCase().trim(), rs: razonSocial, cp: codigoPostal || null, cfdi: cfdiUsoId || null, reg: regimenId }
  )
  return res.recordset[0].dato_fiscal_id
}

async function getDatoFiscal(whatsapp) {
  const res = await query(
    `SELECT df.dato_fiscal_id, df.rfc, df.razon_social, df.codigo_postal,
            df.cfdi_uso_id, df.regimen_id, df.es_predeterminado,
            cu.clave AS cfdi_uso_clave, cu.descripcion AS cfdi_uso_desc,
            rf.clave AS regimen_clave, rf.descripcion AS regimen_nombre
     FROM DatoFiscalCliente df
     LEFT JOIN CfdiUso cu       ON df.cfdi_uso_id = cu.cfdi_uso_id
     LEFT JOIN RegimenFiscal rf ON df.regimen_id  = rf.regimen_id
     WHERE df.whatsapp=@wa AND df.activo=1 AND df.es_predeterminado=1`,
    { wa: whatsapp }
  )
  return res.recordset[0] || null
}

// ══════════════════════════════════════════════════════════════════
//  4. TARJETAS
// ══════════════════════════════════════════════════════════════════
async function guardarTarjeta(whatsapp, { tokenPasarela, ultimos4, marca, esPredeterminada = false }) {
  if (esPredeterminada)
    await query(`UPDATE TarjetaCliente SET es_predeterminada=0 WHERE whatsapp=@wa`, { wa: whatsapp })
  const res = await query(
    `INSERT INTO TarjetaCliente (whatsapp,token_pasarela,ultimos_4,marca,es_predeterminada)
     OUTPUT INSERTED.tarjeta_id VALUES (@wa,@token,@u4,@marca,@pred)`,
    { wa: whatsapp, token: tokenPasarela, u4: ultimos4, marca, pred: esPredeterminada ? 1 : 0 }
  )
  return res.recordset[0].tarjeta_id
}

async function getTarjetas(whatsapp) {
  const res = await query(
    `SELECT tarjeta_id,ultimos_4,marca,es_predeterminada FROM TarjetaCliente
     WHERE whatsapp=@wa AND activa=1 ORDER BY es_predeterminada DESC`,
    { wa: whatsapp }
  )
  return res.recordset
}

// ══════════════════════════════════════════════════════════════════
//  5. PEDIDOS
// ══════════════════════════════════════════════════════════════════
async function crearPedido(pedidoData, items) {
  const pool        = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()

  try {
    const spReq = transaction.request()
    spReq.input("whatsapp",         pedidoData.whatsapp)
    spReq.input("tipo_pedido",      pedidoData.tipoPedido)
    spReq.input("tipo_entrega",     pedidoData.tipoEntrega)
    spReq.input("direccion_id",     pedidoData.direccionId    || null)
    spReq.input("metodo_pago_id",   pedidoData.metodoPagoId)
    spReq.input("requiere_factura", pedidoData.requiereFactura ? 1 : 0)
    spReq.input("dato_fiscal_id",   pedidoData.datoFiscalId   || null)
    spReq.input("canal",            pedidoData.canal          || "whatsapp")
    spReq.input("es_cotizacion",    pedidoData.esCotizacion   ? 1 : 0)
    spReq.input("fecha_evento",     pedidoData.fechaEvento    || null)
    spReq.output("nuevo_pedido_id", sql.Int)

    const spResult = await spReq.execute("sp_CrearPedido")
    const pedidoId = spResult.output.nuevo_pedido_id
    if (!pedidoId) throw new Error("No se pudo crear el pedido")

    let subtotalTotal = 0, ivaTotal = 0
    for (const item of items) {
      const precioReq = transaction.request()
      precioReq.input("pid", item.productoId)
      const precioRes = await precioReq.query(
        `SELECT precio_actual, aplica_iva, tasa_iva FROM Producto WHERE producto_id=@pid AND activo=1`
      )
      const prod = precioRes.recordset[0]
      if (!prod) throw new Error(`Producto ${item.productoId} no encontrado`)

      const precioUnit   = prod.precio_actual
      const subtotalItem = precioUnit * item.cantidad
      const ivaMonto     = prod.aplica_iva ? subtotalItem * prod.tasa_iva : 0
      subtotalTotal += subtotalItem
      ivaTotal      += ivaMonto

      const detReq = transaction.request()
      detReq.input("pedido_id", pedidoId); detReq.input("producto_id", item.productoId)
      detReq.input("cantidad", item.cantidad); detReq.input("precio_unitario", precioUnit)
      detReq.input("aplica_iva", prod.aplica_iva ? 1 : 0); detReq.input("iva_monto", ivaMonto)
      await detReq.query(
        `INSERT INTO DetallePedido (pedido_id,producto_id,cantidad,precio_unitario,aplica_iva,iva_monto)
         VALUES (@pedido_id,@producto_id,@cantidad,@precio_unitario,@aplica_iva,@iva_monto)`
      )
    }

    const updReq = transaction.request()
    updReq.input("pid", pedidoId); updReq.input("subtotal", subtotalTotal); updReq.input("iva", ivaTotal)
    await updReq.query(`UPDATE Pedido SET subtotal=@subtotal, iva=@iva WHERE pedido_id=@pid`)

    const promoResult = await _aplicarPromocionPrimeraCompra(transaction, pedidoId, pedidoData.whatsapp, items)
    const descuento   = promoResult.descuento || 0
    if (descuento > 0) {
      const dscReq = transaction.request()
      dscReq.input("pid", pedidoId); dscReq.input("dsc", descuento)
      await dscReq.query(`UPDATE Pedido SET descuento=@dsc WHERE pedido_id=@pid`)
    }

    const folioReq = transaction.request()
    folioReq.input("pid", pedidoId)
    const folioRes = await folioReq.query(`SELECT folio, total, codigo_entrega_sistema FROM Pedido WHERE pedido_id=@pid`)
    const pedidoInfo = folioRes.recordset[0]

    await transaction.commit()
    return { pedidoId, folio: pedidoInfo.folio, codigoEntrega: pedidoInfo.codigo_entrega_sistema, total: pedidoInfo.total, descuento }
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

async function _aplicarPromocionPrimeraCompra(transaction, pedidoId, whatsapp, items) {
  const checkReq = transaction.request()
  checkReq.input("wa", whatsapp)
  const checkRes = await checkReq.query(
    `SELECT COUNT(*) AS total FROM Pedido
     WHERE whatsapp=@wa AND estado_pedido NOT IN ('cancelado')
       AND pedido_id != (SELECT MAX(pedido_id) FROM Pedido WHERE whatsapp=@wa)`
  )
  if (checkRes.recordset[0].total > 0) return { descuento: 0 }

  const totalEmpanadas = items.reduce((s, i) => s + i.cantidad, 0)
  if (totalEmpanadas < 2) return { descuento: 0 }

  const promoReq = transaction.request()
  const promoRes = await promoReq.query(
    `SELECT TOP 1 promocion_id, producto_gratis_id, cantidad_gratis FROM Promocion
     WHERE tipo='primera_compra' AND activa=1
       AND (fecha_inicio IS NULL OR fecha_inicio <= CAST(GETDATE() AS DATE))
       AND (fecha_fin IS NULL OR fecha_fin >= CAST(GETDATE() AS DATE))`
  )
  const promo = promoRes.recordset[0]
  if (!promo) return { descuento: 0 }

  const precioReq = transaction.request()
  precioReq.input("pid", promo.producto_gratis_id)
  const precioRes = await precioReq.query(`SELECT precio_actual FROM Producto WHERE producto_id=@pid`)
  const precio    = precioRes.recordset[0]?.precio_actual || 0
  const descuento = precio * (promo.cantidad_gratis || 1)

  const regReq = transaction.request()
  regReq.input("pedido_id", pedidoId); regReq.input("promocion_id", promo.promocion_id); regReq.input("descuento_aplicado", descuento)
  await regReq.query(`INSERT INTO PedidoPromocion (pedido_id,promocion_id,descuento_aplicado) VALUES (@pedido_id,@promocion_id,@descuento_aplicado)`)

  return { descuento }
}

async function getHistorialPedidos(whatsapp, limite = 5) {
  const res = await query(
    `SELECT TOP (@lim) p.pedido_id,p.folio,p.tipo_pedido,p.tipo_entrega,
         p.estado_pedido,p.estado_pago,p.total,p.descuento,
         p.fecha_pedido,p.fecha_entrega_real,
         p.calificacion_tiempo,p.calificacion_producto,
         (SELECT STRING_AGG(CAST(dp.cantidad AS VARCHAR)+'x '+pr.nombre,', ')
          FROM DetallePedido dp JOIN Producto pr ON dp.producto_id=pr.producto_id
          WHERE dp.pedido_id=p.pedido_id) AS productos
     FROM Pedido p WHERE p.whatsapp=@wa ORDER BY p.fecha_pedido DESC`,
    { wa: whatsapp, lim: limite }
  )
  return res.recordset
}

async function getDetallePedido(pedidoId) {
  const pedRes = await query(
    `SELECT p.*, dc.calle, dc.numero_exterior, dc.colonia, dc.latitud, dc.longitud,
            df.rfc, df.razon_social, mp.nombre AS metodo_pago_nombre
     FROM Pedido p
     LEFT JOIN DireccionCliente dc  ON p.direccion_id    = dc.direccion_id
     LEFT JOIN DatoFiscalCliente df ON p.dato_fiscal_id  = df.dato_fiscal_id
     LEFT JOIN MetodoPago mp        ON p.metodo_pago_id  = mp.metodo_pago_id
     WHERE p.pedido_id=@pid`, { pid: pedidoId }
  )
  const items = await query(
    `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal,
            pr.nombre AS producto, pr.descripcion
     FROM DetallePedido dp JOIN Producto pr ON dp.producto_id=pr.producto_id
     WHERE dp.pedido_id=@pid`, { pid: pedidoId }
  )
  return { pedido: pedRes.recordset[0], items: items.recordset }
}

// ══════════════════════════════════════════════════════════════════
//  6. PAGOS PASARELA
// ══════════════════════════════════════════════════════════════════
async function crearPagoPasarela(pedidoId, metodoPagoId, monto, urlPago = null) {
  const res = await query(
    `INSERT INTO PagoPasarela (pedido_id,metodo_pago_id,monto,url_pago) OUTPUT INSERTED.pago_id VALUES (@pid,@mp,@monto,@url)`,
    { pid: pedidoId, mp: metodoPagoId, monto, url: urlPago }
  )
  return res.recordset[0].pago_id
}

// ══════════════════════════════════════════════════════════════════
//  7. ENTREGA
// ══════════════════════════════════════════════════════════════════
async function confirmarEntrega(pedidoId, codigoRepartidor, repartidorId) {
  const res = await exec("sp_ConfirmarEntrega", { pedido_id: pedidoId, codigo_repartidor: codigoRepartidor, repartidor_id: repartidorId })
  return res.recordset[0]
}

async function getCodigoEntrega(pedidoId) {
  const res = await query(`SELECT folio, codigo_entrega_sistema FROM Pedido WHERE pedido_id=@pid`, { pid: pedidoId })
  return res.recordset[0] || null
}

// ══════════════════════════════════════════════════════════════════
//  8. OPINIONES
// ══════════════════════════════════════════════════════════════════
async function guardarCalificacionEntrega(pedidoId, calificacion, comentario = null) {
  await query(`UPDATE Pedido SET calificacion_tiempo=@cal, comentario_tiempo=@com WHERE pedido_id=@pid`,
    { pid: pedidoId, cal: calificacion, com: comentario })
}

async function guardarCalificacionProducto(pedidoId, calificacion, comentario = null) {
  await query(`UPDATE Pedido SET calificacion_producto=@cal, comentario_producto=@com WHERE pedido_id=@pid`,
    { pid: pedidoId, cal: calificacion, com: comentario })
}

async function marcarOpinionSolicitada(pedidoId) {
  await query(`UPDATE Pedido SET opinion_solicitada=1 WHERE pedido_id=@pid`, { pid: pedidoId })
}

async function pedidosSinOpinion() {
  const res = await query(
    `SELECT p.pedido_id, p.whatsapp, p.folio, p.fecha_entrega_real
     FROM Pedido p
     WHERE p.estado_pedido='entregado' AND p.opinion_solicitada=0
       AND p.calificacion_producto IS NULL AND p.fecha_entrega_real IS NOT NULL
       AND DATEDIFF(HOUR, p.fecha_entrega_real, GETDATE()) BETWEEN 12 AND 36`
  )
  return res.recordset
}

// ══════════════════════════════════════════════════════════════════
//  9. CATÁLOGOS
// ══════════════════════════════════════════════════════════════════
async function getProductos() {
  const res = await query(`SELECT producto_id,nombre,descripcion,precio_actual,aplica_iva,tasa_iva FROM Producto WHERE activo=1 ORDER BY producto_id`)
  return res.recordset
}

async function verificarCapacidadHoy() {
  const res = await query(`SELECT limite_empanadas,empanadas_vendidas,acepta_pedidos,motivo_cierre FROM CapacidadDiaria WHERE fecha=CAST(GETDATE() AS DATE)`)
  const row = res.recordset[0]
  if (!row) return { aceptaPedidos: true, limite: null, vendidas: 0 }
  return { aceptaPedidos: !!row.acepta_pedidos, limite: row.limite_empanadas, vendidas: row.empanadas_vendidas, motivoCierre: row.motivo_cierre }
}

// ══════════════════════════════════════════════════════════════════
//  10. LOG
// ══════════════════════════════════════════════════════════════════
async function log(nivel, modulo, accion, { whatsapp, empleadoId, pedidoId, detalle, ip } = {}) {
  try {
    await query(
      `INSERT INTO LogSistema (nivel,modulo,accion,whatsapp,empleado_id,pedido_id,detalle,ip_origen)
       VALUES (@nivel,@modulo,@accion,@wa,@emp,@pid,@det,@ip)`,
      {
        nivel, modulo, accion,
        wa: whatsapp || null, emp: empleadoId || null, pid: pedidoId || null,
        det: detalle ? (typeof detalle === "string" ? detalle : JSON.stringify(detalle)) : null,
        ip: ip || null,
      }
    )
  } catch (err) { console.error("⚠️ Error al insertar log:", err.message) }
}

module.exports = {
  upsertCliente, getCliente, guardarSesion, getSesion, limpiarSesionesViejas,
  agregarDireccion, getDirecciones,
  guardarDatoFiscal, getDatoFiscal,
  guardarTarjeta, getTarjetas,
  crearPedido, getHistorialPedidos, getDetallePedido,
  crearPagoPasarela,
  confirmarEntrega, getCodigoEntrega,
  guardarCalificacionEntrega, guardarCalificacionProducto, marcarOpinionSolicitada, pedidosSinOpinion,
  getProductos, verificarCapacidadHoy,
  log, query,  
}