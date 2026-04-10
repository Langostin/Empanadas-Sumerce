/**
 * clienteRepo.js
 * ─────────────────────────────────────────────────────────────────
 * Repositorio del lado del CLIENTE para el bot de WhatsApp.
 * Cubre todos los requerimientos de la sección 3a, 3b y 3c del PDF:
 *
 *   · Upsert de cliente (número WA como PK)
 *   · Sesión del bot (estado + JSON parcial del pedido)
 *   · Múltiples direcciones con GPS
 *   · Datos fiscales (RFC, CFDI, Régimen)
 *   · Tarjetas tokenizadas
 *   · Crear pedido completo con detalle
 *   · Aplicar promoción de primera compra
 *   · Confirmar pago (pasarela)
 *   · Confirmar entrega con código doble
 *   · Guardar calificación / opinión post-entrega
 *   · Consultar historial de pedidos del cliente
 *   · Limpiar sesiones viejas (cron)
 * ─────────────────────────────────────────────────────────────────
 */
 
const { sql, query, exec, getPool } = require("./db")
 
// ══════════════════════════════════════════════════════════════════
//  1. CLIENTE — REGISTRO Y SESIÓN
// ══════════════════════════════════════════════════════════════════
 
/**
 * Crea o actualiza un cliente por su número de WhatsApp.
 * Si ya existe solo actualiza los campos que vengan con valor.
 */
async function upsertCliente({ whatsapp, nombre, apellidos, genero, email }) {
  return exec("sp_UpsertCliente", { whatsapp, nombre, apellidos, genero, email })
}
 
/**
 * Obtiene los datos completos de un cliente.
 * Devuelve null si no existe.
 */
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
 
/**
 * Guarda el estado de la conversación del bot en la BD.
 * step     = nombre del paso ('inicio', 'tipo_empanada', etc.)
 * datosJson = objeto JS que se serializa a JSON
 */
async function guardarSesion(whatsapp, step, datosObj) {
  return exec("sp_GuardarSesionBot", {
    whatsapp,
    step,
    datos_json: JSON.stringify(datosObj),
  })
}
 
/**
 * Recupera la sesión activa del bot para un cliente.
 * Devuelve { step, datos } o { step: 'inicio', datos: {} } si no hay sesión.
 */
async function getSesion(whatsapp) {
  const res = await query(
    `SELECT sesion_estado, sesion_datos, sesion_actualizada
     FROM Cliente WHERE whatsapp = @wa`,
    { wa: whatsapp }
  )
  const row = res.recordset[0]
  if (!row) return { step: "inicio", datos: {} }
  return {
    step:  row.sesion_estado || "inicio",
    datos: row.sesion_datos ? JSON.parse(row.sesion_datos) : {},
    actualizada: row.sesion_actualizada,
  }
}
 
/**
 * Limpia sesiones con más de 5 días sin actividad.
 * Llamar desde un cron diario.
 */
async function limpiarSesionesViejas() {
  return exec("sp_LimpiarSesionesViejas")
}
 
// ══════════════════════════════════════════════════════════════════
//  2. DIRECCIONES
// ══════════════════════════════════════════════════════════════════
 
/**
 * Agrega una nueva dirección al cliente.
 * coords = { latitud, longitud } — opcional (GPS de WhatsApp)
 */
async function agregarDireccion(whatsapp, { alias, calle, numeroExterior, numeroInterior,
  colonia, ciudad, estado, codigoPostal, latitud, longitud, esPredeterminada = false }) {
 
  // Si se marca predeterminada, quitar la anterior
  if (esPredeterminada) {
    await query(
      `UPDATE DireccionCliente SET es_predeterminada = 0 WHERE whatsapp = @wa`,
      { wa: whatsapp }
    )
  }
 
  const res = await query(
    `INSERT INTO DireccionCliente
       (whatsapp, alias, calle, numero_exterior, numero_interior,
        colonia, ciudad, estado, codigo_postal,
        latitud, longitud, es_predeterminada)
     OUTPUT INSERTED.direccion_id
     VALUES (@wa, @alias, @calle, @ne, @ni, @col, @ciudad, @estado, @cp, @lat, @lng, @pred)`,
    {
      wa: whatsapp, alias, calle, ne: numeroExterior, ni: numeroInterior,
      col: colonia, ciudad: ciudad || "Ciudad Juárez", estado: estado || "Chihuahua",
      cp: codigoPostal, lat: latitud || null, lng: longitud || null,
      pred: esPredeterminada ? 1 : 0,
    }
  )
  return res.recordset[0].direccion_id
}
 
/**
 * Lista todas las direcciones activas de un cliente.
 */
async function getDirecciones(whatsapp) {
  const res = await query(
    `SELECT direccion_id, alias, calle, numero_exterior, numero_interior,
            colonia, ciudad, estado, codigo_postal,
            latitud, longitud, es_predeterminada
     FROM DireccionCliente
     WHERE whatsapp = @wa AND activa = 1
     ORDER BY es_predeterminada DESC, fecha_registro DESC`,
    { wa: whatsapp }
  )
  return res.recordset
}
 
// ══════════════════════════════════════════════════════════════════
//  3. DATOS FISCALES
// ══════════════════════════════════════════════════════════════════
 
/**
 * Guarda datos fiscales del cliente.
 * Si ya tiene uno guardado como predeterminado, actualiza; si no, inserta.
 */
async function guardarDatoFiscal(whatsapp, { rfc, razonSocial, calle, numeroExterior,
  numeroInterior, colonia, codigoPostal, cfdiUsoId, regimenId }) {
 
  // Desactivar datos fiscales anteriores
  await query(
    `UPDATE DatoFiscalCliente SET es_predeterminado = 0 WHERE whatsapp = @wa`,
    { wa: whatsapp }
  )
 
  const res = await query(
    `INSERT INTO DatoFiscalCliente
       (whatsapp, rfc, razon_social, calle, numero_exterior, numero_interior,
        colonia, codigo_postal, cfdi_uso_id, regimen_id, es_predeterminado)
     OUTPUT INSERTED.dato_fiscal_id
     VALUES (@wa, @rfc, @rs, @calle, @ne, @ni, @col, @cp, @cfdi, @reg, 1)`,
    {
      wa: whatsapp, rfc: rfc.toUpperCase(), rs: razonSocial,
      calle, ne: numeroExterior, ni: numeroInterior,
      col: colonia, cp: codigoPostal,
      cfdi: cfdiUsoId || null, reg: regimenId || null,
    }
  )
  return res.recordset[0].dato_fiscal_id
}
 
/**
 * Obtiene los datos fiscales predeterminados del cliente.
 */
async function getDatoFiscal(whatsapp) {
  const res = await query(
    `SELECT df.*, cu.clave AS cfdi_clave, cu.descripcion AS cfdi_desc,
            rf.clave AS regimen_clave, rf.descripcion AS regimen_desc
     FROM DatoFiscalCliente df
     LEFT JOIN CfdiUso cu        ON df.cfdi_uso_id = cu.cfdi_uso_id
     LEFT JOIN RegimenFiscal rf  ON df.regimen_id  = rf.regimen_id
     WHERE df.whatsapp = @wa AND df.activo = 1 AND df.es_predeterminado = 1`,
    { wa: whatsapp }
  )
  return res.recordset[0] || null
}
 
// ══════════════════════════════════════════════════════════════════
//  4. TARJETAS
// ══════════════════════════════════════════════════════════════════
 
/**
 * Guarda una tarjeta tokenizada del cliente.
 */
async function guardarTarjeta(whatsapp, { tokenPasarela, ultimos4, marca, esPredeterminada = false }) {
  if (esPredeterminada) {
    await query(
      `UPDATE TarjetaCliente SET es_predeterminada = 0 WHERE whatsapp = @wa`,
      { wa: whatsapp }
    )
  }
  const res = await query(
    `INSERT INTO TarjetaCliente (whatsapp, token_pasarela, ultimos_4, marca, es_predeterminada)
     OUTPUT INSERTED.tarjeta_id
     VALUES (@wa, @token, @u4, @marca, @pred)`,
    { wa: whatsapp, token: tokenPasarela, u4: ultimos4, marca, pred: esPredeterminada ? 1 : 0 }
  )
  return res.recordset[0].tarjeta_id
}
 
/**
 * Lista tarjetas activas del cliente.
 */
async function getTarjetas(whatsapp) {
  const res = await query(
    `SELECT tarjeta_id, ultimos_4, marca, es_predeterminada
     FROM TarjetaCliente WHERE whatsapp = @wa AND activa = 1
     ORDER BY es_predeterminada DESC`,
    { wa: whatsapp }
  )
  return res.recordset
}
 
// ══════════════════════════════════════════════════════════════════
//  5. PEDIDOS
// ══════════════════════════════════════════════════════════════════
 
/**
 * Crea un pedido completo con su detalle de productos.
 *
 * @param {object} pedidoData
 *   whatsapp, tipoPedido ('individual'|'evento'), tipoEntrega ('domicilio'|'tienda'),
 *   direccionId, metodoPagoId (1=efectivo, 2=débito, 3=crédito),
 *   tarjetaId, requiereFactura, datoFiscalId, canal, esCotizacion, fechaEvento
 *
 * @param {Array} items  [{ productoId, cantidad }]
 *
 * @returns {{ pedidoId, folio, codigoEntrega, total }}
 */
async function crearPedido(pedidoData, items) {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
 
  try {
    // 1. Crear cabecera del pedido via SP (valida capacidad diaria)
    const spReq = transaction.request()
    spReq.input("whatsapp",         pedidoData.whatsapp)
    spReq.input("tipo_pedido",      pedidoData.tipoPedido)
    spReq.input("tipo_entrega",     pedidoData.tipoEntrega)
    spReq.input("direccion_id",     pedidoData.direccionId     || null)
    spReq.input("metodo_pago_id",   pedidoData.metodoPagoId)
    spReq.input("requiere_factura", pedidoData.requiereFactura ? 1 : 0)
    spReq.input("dato_fiscal_id",   pedidoData.datoFiscalId    || null)
    spReq.input("canal",            pedidoData.canal           || "whatsapp")
    spReq.input("es_cotizacion",    pedidoData.esCotizacion    ? 1 : 0)
    spReq.input("fecha_evento",     pedidoData.fechaEvento     || null)
    spReq.output("nuevo_pedido_id", sql.Int)
 
    const spResult = await spReq.execute("sp_CrearPedido")
    const pedidoId = spResult.output.nuevo_pedido_id
 
    if (!pedidoId) throw new Error("No se pudo crear el pedido (sp_CrearPedido devolvió null)")
 
    // 2. Insertar líneas de detalle
    let subtotalTotal = 0
    let ivaTotal = 0
 
    for (const item of items) {
      // Obtener precio actual del producto
      const precioReq = transaction.request()
      precioReq.input("pid", item.productoId)
      const precioRes = await precioReq.query(
        `SELECT precio_actual, aplica_iva, tasa_iva FROM Producto WHERE producto_id = @pid AND activo = 1`
      )
      const prod = precioRes.recordset[0]
      if (!prod) throw new Error(`Producto ${item.productoId} no encontrado o inactivo`)
 
      const precioUnit = prod.precio_actual
      const subtotalItem = precioUnit * item.cantidad
      const ivaMonto = prod.aplica_iva ? subtotalItem * prod.tasa_iva : 0
 
      subtotalTotal += subtotalItem
      ivaTotal += ivaMonto
 
      const detReq = transaction.request()
      detReq.input("pedido_id",      pedidoId)
      detReq.input("producto_id",    item.productoId)
      detReq.input("cantidad",       item.cantidad)
      detReq.input("precio_unitario", precioUnit)
      detReq.input("aplica_iva",     prod.aplica_iva ? 1 : 0)
      detReq.input("iva_monto",      ivaMonto)
 
      await detReq.query(
        `INSERT INTO DetallePedido (pedido_id, producto_id, cantidad, precio_unitario, aplica_iva, iva_monto)
         VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario, @aplica_iva, @iva_monto)`
      )
    }
 
    // 3. Actualizar totales del pedido
    const updReq = transaction.request()
    updReq.input("pid",       pedidoId)
    updReq.input("subtotal",  subtotalTotal)
    updReq.input("iva",       ivaTotal)
    await updReq.query(
      `UPDATE Pedido SET subtotal = @subtotal, iva = @iva WHERE pedido_id = @pid`
    )
 
    // 4. Verificar y aplicar promoción de primera compra
    //    (compra 2 empanadas → 1 gratis, solo primer pedido)
    const promoResult = await aplicarPromocionPrimeraCompra(transaction, pedidoId, pedidoData.whatsapp, items)
    const descuento = promoResult.descuento || 0
 
    if (descuento > 0) {
      const dscReq = transaction.request()
      dscReq.input("pid",  pedidoId)
      dscReq.input("dsc",  descuento)
      await dscReq.query(`UPDATE Pedido SET descuento = @dsc WHERE pedido_id = @pid`)
    }
 
    // 5. Obtener folio y código generado
    const folioReq = transaction.request()
    folioReq.input("pid", pedidoId)
    const folioRes = await folioReq.query(
      `SELECT folio, total, codigo_entrega_sistema FROM Pedido WHERE pedido_id = @pid`
    )
    const pedidoInfo = folioRes.recordset[0]
 
    await transaction.commit()
 
    return {
      pedidoId,
      folio:          pedidoInfo.folio,
      codigoEntrega:  pedidoInfo.codigo_entrega_sistema,
      total:          pedidoInfo.total,
      descuento,
    }
 
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}
 
/**
 * Aplica la promoción de primera compra dentro de una transacción.
 * Regla: si es el primer pedido Y lleva 2+ empanadas → 1 empanada gratis
 * @returns {{ descuento: number }}
 */
async function aplicarPromocionPrimeraCompra(transaction, pedidoId, whatsapp, items) {
  // Solo aplica si es el primer pedido confirmado del cliente
  const checkReq = transaction.request()
  checkReq.input("wa", whatsapp)
  const checkRes = await checkReq.query(
    `SELECT COUNT(*) AS total FROM Pedido
     WHERE whatsapp = @wa AND estado_pedido NOT IN ('cancelado') AND pedido_id != (SELECT MAX(pedido_id) FROM Pedido WHERE whatsapp = @wa)`
  )
  const pedidosPrevios = checkRes.recordset[0].total
  if (pedidosPrevios > 0) return { descuento: 0 }  // No es primer pedido
 
  // Contar total de empanadas en el pedido actual
  const totalEmpanadas = items.reduce((sum, i) => sum + i.cantidad, 0)
  if (totalEmpanadas < 2) return { descuento: 0 }  // Necesita 2+
 
  // Obtener la promoción activa de primera compra
  const promoReq = transaction.request()
  const promoRes = await promoReq.query(
    `SELECT TOP 1 promocion_id, producto_gratis_id, cantidad_gratis
     FROM Promocion
     WHERE tipo = 'primera_compra' AND activa = 1
       AND (fecha_inicio IS NULL OR fecha_inicio <= CAST(GETDATE() AS DATE))
       AND (fecha_fin IS NULL OR fecha_fin >= CAST(GETDATE() AS DATE))`
  )
  const promo = promoRes.recordset[0]
  if (!promo) return { descuento: 0 }
 
  // Calcular descuento: precio de 1 empanada gratis
  const precioReq = transaction.request()
  precioReq.input("pid", promo.producto_gratis_id)
  const precioRes = await precioReq.query(
    `SELECT precio_actual FROM Producto WHERE producto_id = @pid`
  )
  const precio = precioRes.recordset[0]?.precio_actual || 0
  const descuento = precio * (promo.cantidad_gratis || 1)
 
  // Registrar aplicación de la promoción
  const regReq = transaction.request()
  regReq.input("pedido_id",         pedidoId)
  regReq.input("promocion_id",      promo.promocion_id)
  regReq.input("descuento_aplicado", descuento)
  await regReq.query(
    `INSERT INTO PedidoPromocion (pedido_id, promocion_id, descuento_aplicado)
     VALUES (@pedido_id, @promocion_id, @descuento_aplicado)`
  )
 
  return { descuento }
}
 
// ══════════════════════════════════════════════════════════════════
//  6. PAGOS CON PASARELA
// ══════════════════════════════════════════════════════════════════
 
/**
 * Registra un intento de pago con pasarela y devuelve el pago_id.
 */
async function crearPagoPasarela(pedidoId, metodoPagoId, monto, urlPago = null) {
  const res = await query(
    `INSERT INTO PagoPasarela (pedido_id, metodo_pago_id, monto, url_pago)
     OUTPUT INSERTED.pago_id
     VALUES (@pid, @mp, @monto, @url)`,
    { pid: pedidoId, mp: metodoPagoId, monto, url: urlPago }
  )
  return res.recordset[0].pago_id
}
 
/**
 * Confirma un pago aprobado por la pasarela.
 * Actualiza estado_pago del pedido y registra la referencia externa.
 */
async function confirmarPagoPasarela(pagoId, referenciaExterna, comision = null) {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    // Actualizar registro de pago
    const updPago = transaction.request()
    updPago.input("pago_id",   pagoId)
    updPago.input("ref",       referenciaExterna)
    updPago.input("comision",  comision)
    await updPago.query(
      `UPDATE PagoPasarela
       SET estado = 'aprobado', referencia_externa = @ref,
           comision_pasarela = @comision, fecha_confirmacion = GETDATE()
       WHERE pago_id = @pago_id`
    )
 
    // Obtener pedido_id
    const getP = transaction.request()
    getP.input("pago_id", pagoId)
    const getRes = await getP.query(`SELECT pedido_id FROM PagoPasarela WHERE pago_id = @pago_id`)
    const pedidoId = getRes.recordset[0]?.pedido_id
 
    // Marcar pedido como pagado
    if (pedidoId) {
      const updPedido = transaction.request()
      updPedido.input("pid", pedidoId)
      updPedido.input("ref", referenciaExterna)
      await updPedido.query(
        `UPDATE Pedido
         SET estado_pago = 'pagado', referencia_pago = @ref,
             fecha_confirmacion = GETDATE(), estado_pedido = 'en_cocina'
         WHERE pedido_id = @pid`
      )
      // Actualizar estado en cocina
      const updCocina = transaction.request()
      updCocina.input("pid", pedidoId)
      await updCocina.query(
        `UPDATE EstadoCocina SET estado = 'pendiente', fecha_inicio = GETDATE()
         WHERE pedido_id = @pid`
      )
    }
 
    await transaction.commit()
    return { ok: true, pedidoId }
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}
 
// ══════════════════════════════════════════════════════════════════
//  7. ENTREGA Y CONFIRMACIÓN
// ══════════════════════════════════════════════════════════════════
 
/**
 * Confirma la entrega usando el código de dos partes (sistema + repartidor).
 * Llama al SP que valida los códigos y actualiza el pedido.
 */
async function confirmarEntrega(pedidoId, codigoRepartidor, repartidorId) {
  const res = await exec("sp_ConfirmarEntrega", {
    pedido_id:          pedidoId,
    codigo_repartidor:  codigoRepartidor,
    repartidor_id:      repartidorId,
  })
  return res.recordset[0]  // { entrega_confirmada: 0|1, mensaje: string }
}
 
/**
 * Reenvía el código de entrega al cliente por WhatsApp.
 * Devuelve el código para que el bot lo mande.
 */
async function getCodigoEntrega(pedidoId) {
  const res = await query(
    `SELECT folio, codigo_entrega_sistema FROM Pedido WHERE pedido_id = @pid`,
    { pid: pedidoId }
  )
  return res.recordset[0] || null
}
 
// ══════════════════════════════════════════════════════════════════
//  8. OPINIONES / CALIFICACIONES POST-ENTREGA
// ══════════════════════════════════════════════════════════════════
 
/**
 * Guarda la calificación del tiempo de entrega (se pide inmediatamente).
 */
async function guardarCalificacionEntrega(pedidoId, calificacion, comentario = null) {
  await query(
    `UPDATE Pedido
     SET calificacion_tiempo = @cal, comentario_tiempo = @com
     WHERE pedido_id = @pid`,
    { pid: pedidoId, cal: calificacion, com: comentario }
  )
}
 
/**
 * Guarda la calificación del producto (se pide al día siguiente).
 */
async function guardarCalificacionProducto(pedidoId, calificacion, comentario = null) {
  await query(
    `UPDATE Pedido
     SET calificacion_producto = @cal, comentario_producto = @com
     WHERE pedido_id = @pid`,
    { pid: pedidoId, cal: calificacion, com: comentario }
  )
}
 
/**
 * Marca que ya se le solicitó la opinión al cliente.
 */
async function marcarOpinionSolicitada(pedidoId) {
  await query(
    `UPDATE Pedido SET opinion_solicitada = 1 WHERE pedido_id = @pid`,
    { pid: pedidoId }
  )
}
 
/**
 * Lista pedidos entregados sin calificación de producto para el cron de opiniones.
 */
async function pedidosSinOpinion() {
  const res = await query(
    `SELECT p.pedido_id, p.whatsapp, p.folio, p.fecha_entrega_real
     FROM Pedido p
     WHERE p.estado_pedido = 'entregado'
       AND p.opinion_solicitada = 0
       AND p.calificacion_producto IS NULL
       AND p.fecha_entrega_real IS NOT NULL
       AND DATEDIFF(HOUR, p.fecha_entrega_real, GETDATE()) BETWEEN 12 AND 36`
  )
  return res.recordset
}
 
// ══════════════════════════════════════════════════════════════════
//  9. HISTORIAL DE PEDIDOS DEL CLIENTE
// ══════════════════════════════════════════════════════════════════
 
/**
 * Devuelve el historial de pedidos de un cliente (últimos N).
 */
async function getHistorialPedidos(whatsapp, limite = 5) {
  const res = await query(
    `SELECT TOP (@lim)
         p.pedido_id, p.folio, p.tipo_pedido, p.tipo_entrega,
         p.estado_pedido, p.estado_pago, p.total, p.descuento,
         p.fecha_pedido, p.fecha_entrega_real,
         p.calificacion_tiempo, p.calificacion_producto,
         -- Detalle comprimido
         (SELECT STRING_AGG(CAST(dp.cantidad AS VARCHAR) + 'x ' + pr.nombre, ', ')
          FROM DetallePedido dp JOIN Producto pr ON dp.producto_id = pr.producto_id
          WHERE dp.pedido_id = p.pedido_id) AS productos
     FROM Pedido p
     WHERE p.whatsapp = @wa
     ORDER BY p.fecha_pedido DESC`,
    { wa: whatsapp, lim: limite }
  )
  return res.recordset
}
 
/**
 * Obtiene el detalle completo de un pedido específico.
 */
async function getDetallePedido(pedidoId) {
  const pedRes = await query(
    `SELECT p.*, dc.calle, dc.numero_exterior, dc.colonia,
            dc.latitud, dc.longitud,
            df.rfc, df.razon_social,
            mp.nombre AS metodo_pago_nombre
     FROM Pedido p
     LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
     LEFT JOIN DatoFiscalCliente df ON p.dato_fiscal_id = df.dato_fiscal_id
     LEFT JOIN MetodoPago mp       ON p.metodo_pago_id = mp.metodo_pago_id
     WHERE p.pedido_id = @pid`,
    { pid: pedidoId }
  )
  const items = await query(
    `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal,
            pr.nombre AS producto, pr.descripcion
     FROM DetallePedido dp JOIN Producto pr ON dp.producto_id = pr.producto_id
     WHERE dp.pedido_id = @pid`,
    { pid: pedidoId }
  )
  return { pedido: pedRes.recordset[0], items: items.recordset }
}
 
// ══════════════════════════════════════════════════════════════════
//  10. CATÁLOGOS (para los menús del bot)
// ══════════════════════════════════════════════════════════════════
 
/** Lista productos activos con precio. */
async function getProductos() {
  const res = await query(
    `SELECT producto_id, nombre, descripcion, precio_actual, aplica_iva, tasa_iva
     FROM Producto WHERE activo = 1 ORDER BY producto_id`
  )
  return res.recordset
}
 
/** Lista los usos de CFDI para el menú de facturación. */
async function getCfdiUsos() {
  const res = await query(`SELECT cfdi_uso_id, clave, descripcion FROM CfdiUso ORDER BY cfdi_uso_id`)
  return res.recordset
}
 
/** Lista los regímenes fiscales para el menú de facturación. */
async function getRegimenesFiscales() {
  const res = await query(`SELECT regimen_id, clave, descripcion FROM RegimenFiscal ORDER BY regimen_id`)
  return res.recordset
}
 
/** Verifica si el negocio acepta pedidos hoy. */
async function verificarCapacidadHoy() {
  const res = await query(
    `SELECT limite_empanadas, empanadas_vendidas, acepta_pedidos, motivo_cierre
     FROM CapacidadDiaria WHERE fecha = CAST(GETDATE() AS DATE)`
  )
  const row = res.recordset[0]
  if (!row) return { aceptaPedidos: true, limite: null, vendidas: 0 }
  return {
    aceptaPedidos: !!row.acepta_pedidos,
    limite:        row.limite_empanadas,
    vendidas:      row.empanadas_vendidas,
    motivoCierre:  row.motivo_cierre,
  }
}
 
// ══════════════════════════════════════════════════════════════════
//  11. LOG DEL SISTEMA
// ══════════════════════════════════════════════════════════════════
 
async function log(nivel, modulo, accion, { whatsapp, empleadoId, pedidoId, detalle, ip } = {}) {
  try {
    await query(
      `INSERT INTO LogSistema (nivel, modulo, accion, whatsapp, empleado_id, pedido_id, detalle, ip_origen)
       VALUES (@nivel, @modulo, @accion, @wa, @emp, @pid, @det, @ip)`,
      {
        nivel, modulo, accion,
        wa:  whatsapp   || null,
        emp: empleadoId || null,
        pid: pedidoId   || null,
        det: detalle ? (typeof detalle === "string" ? detalle : JSON.stringify(detalle)) : null,
        ip:  ip         || null,
      }
    )
  } catch (err) {
    // El log nunca debe romper el flujo principal
    console.error("⚠️ Error al insertar log:", err.message)
  }
}
 
module.exports = {
  // Cliente
  upsertCliente,
  getCliente,
  guardarSesion,
  getSesion,
  limpiarSesionesViejas,
  // Direcciones
  agregarDireccion,
  getDirecciones,
  // Datos fiscales
  guardarDatoFiscal,
  getDatoFiscal,
  // Tarjetas
  guardarTarjeta,
  getTarjetas,
  // Pedidos
  crearPedido,
  getHistorialPedidos,
  getDetallePedido,
  // Pagos
  crearPagoPasarela,
  confirmarPagoPasarela,
  // Entrega
  confirmarEntrega,
  getCodigoEntrega,
  // Opiniones
  guardarCalificacionEntrega,
  guardarCalificacionProducto,
  marcarOpinionSolicitada,
  pedidosSinOpinion,
  // Catálogos
  getProductos,
  getCfdiUsos,
  getRegimenesFiscales,
  verificarCapacidadHoy,
  // Log
  log,
}