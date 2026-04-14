// backend/routes/inventario.js
const express = require("express");
const { q, sql } = require("../db");
const { requireRole } = require("../middleware/requireAuth");

const router = express.Router();
const admin  = requireRole("administrador");

// ══════════════════════════════════════════════════════════════
//  i. PRODUCTOS EN EXISTENCIA — todos los insumos con stock
// ══════════════════════════════════════════════════════════════
router.get("/insumos", admin, async (req, res) => {
  try {
    const { search = "" } = req.query;
    const r = await q(
      `SELECT
         i.insumo_id,
         i.nombre,
         i.descripcion,
         i.stock_actual,
         i.stock_minimo,
         i.costo_unitario,
         i.activo,
         i.fecha_registro,
         um.clave   AS unidad_clave,
         um.nombre  AS unidad_nombre,
         p.nombre   AS proveedor,
         p.telefono AS proveedor_tel,
         p.email    AS proveedor_email,
         -- Estado semáforo
         CASE
           WHEN i.stock_actual <= 0              THEN 'agotado'
           WHEN i.stock_actual <= i.stock_minimo THEN 'critico'
           WHEN i.stock_actual <= i.stock_minimo * 1.5 THEN 'bajo'
           ELSE 'ok'
         END AS estado_stock,
         -- Valor total del inventario para este insumo
         ROUND(i.stock_actual * i.costo_unitario, 2) AS valor_inventario
       FROM Insumo i
       JOIN UnidadMedida um ON i.unidad_id    = um.unidad_id
       LEFT JOIN Proveedor p ON i.proveedor_id = p.proveedor_id
       WHERE i.activo = 1
         AND (@s = '' OR i.nombre LIKE '%' + @s + '%')
       ORDER BY
         CASE WHEN i.stock_actual <= i.stock_minimo THEN 0 ELSE 1 END,
         i.nombre`,
      { s: search }
    );

    // Totales para tarjetas de resumen
    const totales = await q(
      `SELECT
         COUNT(*)                                      AS total_insumos,
         SUM(CASE WHEN stock_actual <= 0              THEN 1 ELSE 0 END) AS agotados,
         SUM(CASE WHEN stock_actual > 0
                   AND stock_actual <= stock_minimo   THEN 1 ELSE 0 END) AS criticos,
         SUM(CASE WHEN stock_actual > stock_minimo
                   AND stock_actual <= stock_minimo*1.5 THEN 1 ELSE 0 END) AS bajos,
         ROUND(SUM(stock_actual * costo_unitario), 2) AS valor_total
       FROM Insumo WHERE activo = 1`
    );

    res.json({ insumos: r.recordset, resumen: totales.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Crear / editar insumo ──────────────────────────────────────
router.post("/insumos", admin, async (req, res) => {
  try {
    const { nombre, descripcion, unidad_id, proveedor_id, stock_actual, stock_minimo, costo_unitario } = req.body;
    const r = await q(
      `INSERT INTO Insumo (nombre, descripcion, unidad_id, proveedor_id, stock_actual, stock_minimo, costo_unitario)
       OUTPUT INSERTED.insumo_id
       VALUES (@nom, @desc, @uid, @pid, @sa, @sm, @cu)`,
      { nom: nombre, desc: descripcion || null, uid: unidad_id, pid: proveedor_id || null,
        sa: stock_actual || 0, sm: stock_minimo || 0, cu: costo_unitario || 0 }
    );
    res.json({ insumo_id: r.recordset[0].insumo_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/insumos/:id", admin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, descripcion, unidad_id, proveedor_id, stock_actual, stock_minimo, costo_unitario } = req.body;
    await q(
      `UPDATE Insumo SET
         nombre = @nom, descripcion = @desc, unidad_id = @uid,
         proveedor_id = @pid, stock_actual = @sa, stock_minimo = @sm, costo_unitario = @cu
       WHERE insumo_id = @id`,
      { id, nom: nombre, desc: descripcion || null, uid: unidad_id, pid: proveedor_id || null,
        sa: stock_actual, sm: stock_minimo, cu: costo_unitario }
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  ii. COMPRAS URGENTES — stock ≤ mínimo
// ══════════════════════════════════════════════════════════════
router.get("/stock-critico", admin, async (req, res) => {
  try {
    const r = await q(
      `SELECT TOP (100) PERCENT
         i.insumo_id,
         i.nombre,
         um.clave              AS unidad_clave,
         um.nombre             AS unidad_nombre,
         i.stock_actual,
         i.stock_minimo,
         ROUND(i.stock_actual - i.stock_minimo, 3) AS diferencia,
         i.costo_unitario,
         p.nombre              AS proveedor,
         p.telefono            AS telefono_proveedor,
         p.email               AS email_proveedor,
         CASE
           WHEN i.stock_actual <= 0              THEN 'agotado'
           ELSE 'critico'
         END AS nivel
       FROM Insumo i
       JOIN UnidadMedida um    ON i.unidad_id    = um.unidad_id
       LEFT JOIN Proveedor p   ON i.proveedor_id = p.proveedor_id
       WHERE i.activo = 1
         AND i.stock_actual <= i.stock_minimo
       ORDER BY (i.stock_actual - i.stock_minimo)`
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Registrar movimiento de inventario (compra / ajuste / merma) ─
router.post("/movimientos", admin, async (req, res) => {
  try {
    const { insumo_id, tipo_mov_id, cantidad, costo_unitario, motivo, proveedor_id } = req.body;
    const empleadoId = req.user.empleadoId;

    // Insertar movimiento
    await q(
      `INSERT INTO MovimientoInventario
         (insumo_id, tipo_mov_id, proveedor_id, empleado_id, cantidad, costo_unitario, motivo)
       VALUES (@iid, @tid, @pid, @eid, @cant, @cu, @mot)`,
      { iid: insumo_id, tid: tipo_mov_id, pid: proveedor_id || null,
        eid: empleadoId, cant: cantidad, cu: costo_unitario || null, mot: motivo || null }
    );

    // Actualizar stock_actual según si es entrada o salida
    await q(
      `UPDATE i SET
         i.stock_actual = i.stock_actual +
           CASE WHEN tm.es_entrada = 1 THEN @cant ELSE -@cant END
       FROM Insumo i
       JOIN TipoMovimientoInventario tm ON tm.tipo_mov_id = @tid
       WHERE i.insumo_id = @iid`,
      { iid: insumo_id, tid: tipo_mov_id, cant: cantidad }
    );

    // Verificar si quedó en stock crítico → generar alerta
    const check = await q(
      `SELECT i.nombre, i.stock_actual, i.stock_minimo
       FROM Insumo i WHERE insumo_id = @iid`,
      { iid: insumo_id }
    );
    const ins = check.recordset[0];
    if (ins && ins.stock_actual <= ins.stock_minimo) {
      await q(
        `INSERT INTO Alerta (tipo, referencia_id, mensaje)
         VALUES ('stock_minimo', @iid, @msg)`,
        { iid: insumo_id, msg: `⚠️ Stock crítico: ${ins.nombre} — ${ins.stock_actual} unidades restantes (mínimo: ${ins.stock_minimo})` }
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Historial de movimientos de un insumo ─────────────────────
router.get("/movimientos/:insumo_id", admin, async (req, res) => {
  try {
    const id = parseInt(req.params.insumo_id);
    const r = await q(
      `SELECT TOP 50
         m.movimiento_id,
         tm.nombre        AS tipo_movimiento,
         tm.es_entrada,
         m.cantidad,
         m.costo_unitario,
         m.costo_total,
         m.motivo,
         m.fecha_movimiento,
         e.nombre + ' ' + ISNULL(e.apellidos,'') AS empleado,
         p.nombre         AS proveedor
       FROM MovimientoInventario m
       JOIN TipoMovimientoInventario tm ON m.tipo_mov_id  = tm.tipo_mov_id
       LEFT JOIN Empleado e             ON m.empleado_id  = e.empleado_id
       LEFT JOIN Proveedor p            ON m.proveedor_id = p.proveedor_id
       WHERE m.insumo_id = @id
       ORDER BY m.fecha_movimiento DESC`,
      { id }
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  iii. GASTOS DE GASOLINA DE REPARTIDORES
// ══════════════════════════════════════════════════════════════
router.get("/gastos/gasolina", admin, async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const r = await q(
      `SELECT
         g.gasto_id,
         g.descripcion,
         g.monto,
         g.fecha_gasto,
         g.comprobante_url,
         e.nombre + ' ' + ISNULL(e.apellidos,'') AS empleado,
         e.empleado_id
       FROM GastoOperativo g
       JOIN TipoGasto tg    ON g.tipo_gasto_id = tg.tipo_gasto_id
       LEFT JOIN Empleado e ON g.empleado_id   = e.empleado_id
       WHERE tg.tipo_gasto_id = 2  -- Gasolina / combustible
         AND (@mes  IS NULL OR MONTH(g.fecha_gasto) = @mes)
         AND (@anio IS NULL OR YEAR(g.fecha_gasto)  = @anio)
       ORDER BY g.fecha_gasto DESC`,
      { mes: mes ? parseInt(mes) : null, anio: anio ? parseInt(anio) : null }
    );

    // Total por repartidor
    const porRep = await q(
      `SELECT
         e.empleado_id,
         e.nombre + ' ' + ISNULL(e.apellidos,'') AS empleado,
         COUNT(*)          AS registros,
         SUM(g.monto)      AS total_mxn
       FROM GastoOperativo g
       JOIN TipoGasto tg    ON g.tipo_gasto_id = tg.tipo_gasto_id
       LEFT JOIN Empleado e ON g.empleado_id   = e.empleado_id
       WHERE tg.tipo_gasto_id = 2
         AND (@mes  IS NULL OR MONTH(g.fecha_gasto) = @mes)
         AND (@anio IS NULL OR YEAR(g.fecha_gasto)  = @anio)
       GROUP BY e.empleado_id, e.nombre, e.apellidos
       ORDER BY total_mxn DESC`,
      { mes: mes ? parseInt(mes) : null, anio: anio ? parseInt(anio) : null }
    );

    res.json({ gastos: r.recordset, porRepartidor: porRep.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  iv. GASTOS GENERALES — todos los tipos + registro de nuevo
// ══════════════════════════════════════════════════════════════
router.get("/gastos", admin, async (req, res) => {
  try {
    const { tipo_gasto_id, mes, anio, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const r = await q(
      `SELECT
         g.gasto_id,
         tg.nombre       AS tipo_gasto,
         tg.tipo_gasto_id,
         g.descripcion,
         g.monto,
         g.fecha_gasto,
         g.fecha_registro,
         g.comprobante_url,
         e.nombre + ' ' + ISNULL(e.apellidos,'') AS registrado_por
       FROM GastoOperativo g
       JOIN TipoGasto tg    ON g.tipo_gasto_id = tg.tipo_gasto_id
       LEFT JOIN Empleado e ON g.empleado_id   = e.empleado_id
       WHERE (@tid  IS NULL OR g.tipo_gasto_id = @tid)
         AND (@mes  IS NULL OR MONTH(g.fecha_gasto) = @mes)
         AND (@anio IS NULL OR YEAR(g.fecha_gasto)  = @anio)
       ORDER BY g.fecha_gasto DESC, g.fecha_registro DESC
       OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
      {
        tid: tipo_gasto_id ? parseInt(tipo_gasto_id) : null,
        mes:  mes  ? parseInt(mes)  : null,
        anio: anio ? parseInt(anio) : null,
        off: offset, lim: parseInt(limit),
      }
    );

    // Totales por tipo de gasto
    const porTipo = await q(
      `SELECT
         tg.tipo_gasto_id,
         tg.nombre  AS tipo,
         COUNT(*)   AS registros,
         SUM(g.monto) AS total
       FROM GastoOperativo g
       JOIN TipoGasto tg ON g.tipo_gasto_id = tg.tipo_gasto_id
       WHERE (@mes  IS NULL OR MONTH(g.fecha_gasto) = @mes)
         AND (@anio IS NULL OR YEAR(g.fecha_gasto)  = @anio)
       GROUP BY tg.tipo_gasto_id, tg.nombre
       ORDER BY total DESC`,
      { mes: mes ? parseInt(mes) : null, anio: anio ? parseInt(anio) : null }
    );

    res.json({ gastos: r.recordset, porTipo: porTipo.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/gastos", admin, async (req, res) => {
  try {
    const { tipo_gasto_id, descripcion, monto, fecha_gasto, comprobante_url } = req.body;
    const empleadoId = req.user.empleadoId;
    if (!tipo_gasto_id || !monto) return res.status(400).json({ error: "tipo_gasto_id y monto son requeridos" });
    const r = await q(
      `INSERT INTO GastoOperativo (tipo_gasto_id, empleado_id, descripcion, monto, fecha_gasto, comprobante_url)
       OUTPUT INSERTED.gasto_id
       VALUES (@tid, @eid, @desc, @monto, @fecha, @comp)`,
      {
        tid: tipo_gasto_id, eid: empleadoId,
        desc: descripcion || null, monto,
        fecha: fecha_gasto || null, comp: comprobante_url || null,
      }
    );
    res.json({ gasto_id: r.recordset[0].gasto_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/gastos/:id", admin, async (req, res) => {
  try {
    await q(`DELETE FROM GastoOperativo WHERE gasto_id = @id`, { id: parseInt(req.params.id) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/tipos-gasto", admin, async (_, res) => {
  try {
    const r = await q(`SELECT tipo_gasto_id, nombre FROM TipoGasto ORDER BY tipo_gasto_id`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  v. CORTE DIARIO DE CAJA
// ══════════════════════════════════════════════════════════════
router.get("/corte/hoy", admin, async (_, res) => {
  try {
    // Datos en tiempo real para el corte
    const [ventas, gastos, cortePrevio] = await Promise.all([
      q(`SELECT
           ISNULL(SUM(total),0)                                               AS total_ventas,
           ISNULL(SUM(CASE WHEN metodo_pago_id=1 THEN total ELSE 0 END),0)   AS efectivo,
           ISNULL(SUM(CASE WHEN metodo_pago_id IN(2,3) THEN total ELSE 0 END),0) AS tarjeta,
           COUNT(*)                                                            AS total_pedidos,
           ISNULL(SUM(iva),0)                                                 AS iva_total
         FROM Pedido
         WHERE CAST(fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)
           AND estado_pedido = 'entregado'`),
      q(`SELECT ISNULL(SUM(monto),0) AS total_gastos
         FROM GastoOperativo
         WHERE fecha_gasto = CAST(GETDATE() AS DATE)`),
      q(`SELECT * FROM CorteCaja WHERE fecha_corte = CAST(GETDATE() AS DATE)`),
    ]);

    const v = ventas.recordset[0];
    const g = gastos.recordset[0];

    res.json({
      fecha: new Date().toISOString().split("T")[0],
      total_ventas:   v.total_ventas,
      efectivo:       v.efectivo,
      tarjeta:        v.tarjeta,
      total_pedidos:  v.total_pedidos,
      total_gastos:   g.total_gastos,
      iva_total:      v.iva_total,
      utilidad_bruta: v.total_ventas - g.total_gastos,
      corte_guardado: cortePrevio.recordset[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/corte/ejecutar", admin, async (req, res) => {
  try {
    const empleadoId = req.user.empleadoId;
    const { observaciones } = req.body;

    // Ejecutar SP de corte
    const p = await (await require("../db").getPool()).request();
    p.input("empleado_id",  sql.Int,         empleadoId);
    p.input("fecha_corte",  sql.Date,        null);
    const r = await p.execute("sp_CorteDiario");

    // Agregar observaciones si las hay
    if (observaciones) {
      await q(
        `UPDATE CorteCaja SET observaciones = @obs WHERE fecha_corte = CAST(GETDATE() AS DATE)`,
        { obs: observaciones }
      );
    }

    res.json({ ok: true, corte: r.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  vi. HISTÓRICO DE CORTES DE CAJA
// ══════════════════════════════════════════════════════════════
router.get("/cortes/historico", admin, async (req, res) => {
  try {
    const { anio, mes } = req.query;
    const r = await q(
      `SELECT
         cc.corte_id,
         cc.fecha_corte,
         cc.total_ventas,
         cc.total_efectivo,
         cc.total_tarjeta,
         cc.total_pedidos,
         cc.total_gastos,
         cc.reserva_impuestos,
         cc.utilidad_bruta,
         cc.observaciones,
         cc.fecha_registro,
         e.nombre + ' ' + ISNULL(e.apellidos,'') AS empleado
       FROM CorteCaja cc
       LEFT JOIN Empleado e ON cc.empleado_id = e.empleado_id
       WHERE (@anio IS NULL OR YEAR(cc.fecha_corte)  = @anio)
         AND (@mes  IS NULL OR MONTH(cc.fecha_corte) = @mes)
       ORDER BY cc.fecha_corte DESC`,
      { anio: anio ? parseInt(anio) : null, mes: mes ? parseInt(mes) : null }
    );

    // Acumulados del año
    const acumulado = await q(
      `SELECT
         SUM(total_ventas)        AS ventas_acum,
         SUM(total_gastos)        AS gastos_acum,
         SUM(utilidad_bruta)      AS utilidad_acum,
         SUM(reserva_impuestos)   AS impuestos_acum,
         SUM(total_pedidos)       AS pedidos_acum,
         COUNT(*)                 AS dias_con_corte
       FROM CorteCaja
       WHERE YEAR(fecha_corte) = ISNULL(@anio, YEAR(GETDATE()))`,
      { anio: anio ? parseInt(anio) : null }
    );

    // Gráfica mensual del año
    const mensual = await q(
      `SELECT
         MONTH(fecha_corte)       AS mes,
         SUM(total_ventas)        AS ventas,
         SUM(total_gastos)        AS gastos,
         SUM(utilidad_bruta)      AS utilidad,
         SUM(total_pedidos)       AS pedidos
       FROM CorteCaja
       WHERE YEAR(fecha_corte) = ISNULL(@anio, YEAR(GETDATE()))
       GROUP BY MONTH(fecha_corte)
       ORDER BY mes`,
      { anio: anio ? parseInt(anio) : null }
    );

    res.json({
      cortes:    r.recordset,
      acumulado: acumulado.recordset[0],
      mensual:   mensual.recordset,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Catálogos auxiliares ────────────────────────────────────────
router.get("/unidades-medida", admin, async (_, res) => {
  try {
    const r = await q(`SELECT unidad_id, clave, nombre FROM UnidadMedida ORDER BY unidad_id`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/tipos-movimiento", admin, async (_, res) => {
  try {
    const r = await q(`SELECT tipo_mov_id, nombre, es_entrada FROM TipoMovimientoInventario ORDER BY tipo_mov_id`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/proveedores", admin, async (_, res) => {
  try {
    const r = await q(`SELECT proveedor_id, nombre, telefono, email FROM Proveedor WHERE activo=1 ORDER BY nombre`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;