// backend/routes/repartidor.js
const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { q }   = require("../db");
const { requireRole } = require("../middleware/requireAuth");

// Todas las rutas requieren rol repartidor o administrador
router.use(requireRole("repartidor", "administrador"));

// ══════════════════════════════════════════════════════════════
//  MIS PEDIDOS — pedidos asignados al repartidor en curso
// ══════════════════════════════════════════════════════════════
router.get("/mis-pedidos", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const r = await q(
      `SELECT
         p.pedido_id, p.folio, p.whatsapp,
         ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
         p.estado_pedido, p.total, p.fecha_pedido,
         p.tipo_entrega, p.qr_codigo,
         dc.calle, dc.numero_exterior, dc.colonia, dc.ciudad,
         dc.latitud, dc.longitud,
         ISNULL(dc.calle + ' ' + ISNULL(dc.numero_exterior,'') + ', ' + ISNULL(dc.colonia,''), 'Sin dirección') AS direccion_texto,
         STRING_AGG(CAST(dp.cantidad AS VARCHAR) + 'x ' + pr.nombre, ', ')
           WITHIN GROUP (ORDER BY pr.nombre) AS productos
       FROM Pedido p
       LEFT JOIN Cliente c          ON p.whatsapp     = c.whatsapp
       LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
       LEFT JOIN DetallePedido dp   ON p.pedido_id    = dp.pedido_id
       LEFT JOIN Producto pr        ON dp.producto_id = pr.producto_id
       WHERE p.repartidor_id = @rid
         AND p.estado_pedido IN ('listo','en_camino','completado')
       GROUP BY
         p.pedido_id, p.folio, p.whatsapp,
         c.nombre, c.apellidos,
         p.estado_pedido, p.total, p.fecha_pedido,
         p.tipo_entrega, p.qr_codigo,
         dc.calle, dc.numero_exterior, dc.colonia, dc.ciudad,
         dc.latitud, dc.longitud
       ORDER BY p.fecha_pedido DESC`,
      { rid: repartidorId }
    );
    res.json(r.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  MAPA — pedidos activos con coordenadas
// ══════════════════════════════════════════════════════════════
router.get("/mapa", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const r = await q(
      `SELECT
         p.pedido_id, p.folio, p.estado_pedido,
         ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
         dc.calle, dc.numero_exterior, dc.colonia, dc.ciudad,
         dc.latitud, dc.longitud,
         ISNULL(dc.calle + ' ' + ISNULL(dc.numero_exterior,'') + ', ' + ISNULL(dc.colonia,''), 'Sin dirección') AS direccion_texto,
         p.total, p.entregado
       FROM Pedido p
       LEFT JOIN Cliente c           ON p.whatsapp     = c.whatsapp
       LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
       WHERE p.repartidor_id = @rid
         AND p.tipo_entrega = 'domicilio'
         AND p.estado_pedido IN ('listo','en_camino')
         AND dc.latitud IS NOT NULL
         AND dc.longitud IS NOT NULL`,
      { rid: repartidorId }
    );
    res.json(r.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  HISTORIAL — pedidos entregados
// ══════════════════════════════════════════════════════════════
router.get("/historial", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const { page = 1, limit = 20, fecha } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const r = await q(
      `SELECT
         p.pedido_id, p.folio,
         ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
         p.whatsapp, p.total, p.fecha_pedido, p.fecha_entrega_real,
         p.estado_pedido, p.tipo_entrega,
         ISNULL(dc.calle + ' ' + ISNULL(dc.numero_exterior,'') + ', ' + ISNULL(dc.colonia,''), 'Sin dirección') AS direccion_texto,
         DATEDIFF(minute, p.fecha_pedido, p.fecha_entrega_real) AS minutos_entrega
       FROM Pedido p
       LEFT JOIN Cliente c           ON p.whatsapp     = c.whatsapp
       LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
       WHERE p.repartidor_id = @rid
         AND p.estado_pedido IN ('entregado','completado')
         AND (@fecha = '' OR CAST(p.fecha_pedido AS DATE) = @fecha)
       ORDER BY p.fecha_entrega_real DESC, p.fecha_pedido DESC
       OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
      {
        rid: repartidorId,
        fecha: fecha || "",
        off: offset,
        lim: parseInt(limit),
      }
    );

    const total = await q(
      `SELECT COUNT(*) AS total
       FROM Pedido
       WHERE repartidor_id = @rid
         AND estado_pedido IN ('entregado','completado')
         AND (@fecha = '' OR CAST(fecha_pedido AS DATE) = @fecha)`,
      { rid: repartidorId, fecha: fecha || "" }
    );

    const metricas = await q(
      `SELECT
         COUNT(*) AS total_entregados,
         ISNULL(SUM(total), 0) AS monto_total,
         ISNULL(AVG(CAST(DATEDIFF(minute, fecha_pedido, fecha_entrega_real) AS FLOAT)), 0) AS minutos_promedio
       FROM Pedido
       WHERE repartidor_id = @rid
         AND estado_pedido IN ('entregado','completado')
         AND CAST(fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)`,
      { rid: repartidorId }
    );

    res.json({
      data: r.recordset,
      total: total.recordset[0].total,
      metricas: metricas.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  ESCANEAR QR — asociar pedido al repartidor
// ══════════════════════════════════════════════════════════════
router.post("/escanear", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const { qr_codigo } = req.body;

    if (!qr_codigo) {
      return res.status(400).json({ error: "Se requiere el código QR." });
    }

    // Buscar pedido por qr_codigo
    const pedidoR = await q(
      `SELECT
         p.pedido_id, p.folio, p.whatsapp, p.estado_pedido,
         p.repartidor_id,
         ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
         p.total, p.tipo_entrega,
         ISNULL(dc.calle + ' ' + ISNULL(dc.numero_exterior,'') + ', ' + ISNULL(dc.colonia,''), 'Sin dirección') AS direccion_texto,
         STRING_AGG(CAST(dp.cantidad AS VARCHAR) + 'x ' + pr.nombre, ', ')
           WITHIN GROUP (ORDER BY pr.nombre) AS productos
       FROM Pedido p
       LEFT JOIN Cliente c           ON p.whatsapp     = c.whatsapp
       LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
       LEFT JOIN DetallePedido dp    ON p.pedido_id    = dp.pedido_id
       LEFT JOIN Producto pr         ON dp.producto_id = pr.producto_id
       WHERE p.qr_codigo = @qr
       GROUP BY
         p.pedido_id, p.folio, p.whatsapp, p.estado_pedido,
         p.repartidor_id,
         c.nombre, c.apellidos, p.total, p.tipo_entrega,
         dc.calle, dc.numero_exterior, dc.colonia`,
      { qr: qr_codigo }
    );

    if (!pedidoR.recordset.length) {
      return res.status(404).json({ error: "QR no válido o pedido no encontrado." });
    }

    const pedido = pedidoR.recordset[0];

    if (!["listo", "completado"].includes(pedido.estado_pedido)) {
      return res.status(400).json({
        error: `El pedido está en estado "${pedido.estado_pedido}". Solo se pueden tomar pedidos listos.`,
      });
    }

    if (pedido.repartidor_id && pedido.repartidor_id !== repartidorId) {
      return res.status(409).json({ error: "Este pedido ya está asignado a otro repartidor." });
    }

    // Asignar repartidor y cambiar estado a en_camino
    await q(
      `UPDATE Pedido
       SET repartidor_id = @rid,
           estado_pedido = 'en_camino',
           fecha_confirmacion = CASE WHEN fecha_confirmacion IS NULL THEN GETDATE() ELSE fecha_confirmacion END
       WHERE pedido_id = @pid`,
      { rid: repartidorId, pid: pedido.pedido_id }
    );

    res.json({
      ok: true,
      pedido: {
        ...pedido,
        estado_pedido: "en_camino",
        repartidor_id: repartidorId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  CONFIRMAR ENTREGA
// ══════════════════════════════════════════════════════════════
router.post("/confirmar", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const { codigo } = req.body; // 👈 YA NO pedido_id

    if (!codigo) {
      return res.status(400).json({ error: "Se requiere el código de entrega." });
    }

    // 🔍 Buscar pedido por código (VARCHAR)
    const pedidoR = await q(
      `SELECT pedido_id, folio, estado_pedido, repartidor_id,
              codigo_entrega_sistema, codigo_entrega_repartidor
       FROM Pedido
       WHERE codigo_entrega_sistema = @codigo`,
      { codigo }
    );

    if (!pedidoR.recordset.length) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }

    const pedido = pedidoR.recordset[0];

    // 🔐 Validar repartidor
    if (pedido.repartidor_id !== repartidorId) {
      return res.status(403).json({ error: "No tienes permiso para confirmar este pedido." });
    }

    // ⚠️ Validar estado
    if (pedido.estado_pedido === "entregado" || pedido.estado_pedido === "completado") {
      return res.status(400).json({ error: "Este pedido ya fue entregado." });
    }

    // ✅ Actualizar pedido
    await q(
      `UPDATE Pedido
       SET estado_pedido = 'entregado',
           entregado = 1,
           fecha_entrega_real = GETDATE(),
           codigo_entrega_repartidor = @codigo
       WHERE codigo_entrega_sistema = @codigo`,
      { codigo }
    );

    // 🔔 Notificar al Bot mediante Webhook HTTP
    try {
      await fetch("http://localhost:3000/webhook/admin/entregado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedido.pedido_id })
      });
    } catch (whErr) {
      console.warn("⚠️ No se pudo notificar al bot (webhook):", whErr.message);
    }

    res.json({ ok: true, folio: pedido.folio });
  } catch (err) {
    console.error("ERROR CONFIRMAR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  GASTOS — registrar y listar
// ══════════════════════════════════════════════════════════════
router.get("/gastos", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const { mes } = req.query; // formato YYYY-MM, default: mes actual

    const fechaFiltro = mes || new Date().toISOString().slice(0, 7);
    const [anio, mesNum] = fechaFiltro.split("-");

    const [gastos, tipos, resumen] = await Promise.all([
      q(
        `SELECT
           g.gasto_id, g.descripcion, g.monto, g.fecha_gasto, g.fecha_registro,
           t.nombre AS tipo_gasto
         FROM GastoOperativo g
         JOIN TipoGasto t ON g.tipo_gasto_id = t.tipo_gasto_id
         WHERE g.empleado_id = @rid
           AND YEAR(g.fecha_gasto) = @anio
           AND MONTH(g.fecha_gasto) = @mes
         ORDER BY g.fecha_gasto DESC`,
        { rid: repartidorId, anio: parseInt(anio), mes: parseInt(mesNum) }
      ),
      q(`SELECT tipo_gasto_id, nombre FROM TipoGasto ORDER BY tipo_gasto_id`),
      q(
        `SELECT ISNULL(SUM(monto), 0) AS total_mes, COUNT(*) AS total_registros
         FROM GastoOperativo
         WHERE empleado_id = @rid
           AND YEAR(fecha_gasto) = @anio
           AND MONTH(fecha_gasto) = @mes`,
        { rid: repartidorId, anio: parseInt(anio), mes: parseInt(mesNum) }
      ),
    ]);

    res.json({
      gastos: gastos.recordset,
      tipos: tipos.recordset,
      resumen: resumen.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/gastos", async (req, res) => {
  try {
    const repartidorId = req.user.empleadoId;
    const { tipo_gasto_id, monto, descripcion, fecha_gasto } = req.body;

    if (!tipo_gasto_id || !monto) {
      return res.status(400).json({ error: "tipo_gasto_id y monto son requeridos." });
    }

    const r = await q(
      `INSERT INTO GastoOperativo (tipo_gasto_id, empleado_id, descripcion, monto, fecha_gasto, fecha_registro)
       OUTPUT INSERTED.gasto_id
       VALUES (@tipo, @rid, @desc, @monto, @fecha, GETDATE())`,
      {
        tipo: parseInt(tipo_gasto_id),
        rid: repartidorId,
        desc: descripcion || null,
        monto: parseFloat(monto),
        fecha: fecha_gasto || new Date().toISOString().slice(0, 10),
      }
    );

    res.json({ ok: true, gasto_id: r.recordset[0].gasto_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  GENERAR QR en cocina (al marcar pedido como "listo")
//  Disponible para cocina y admin también
// ══════════════════════════════════════════════════════════════
router.post("/generar-qr/:pedidoId", async (req, res) => {
  try {
    const pedidoId = parseInt(req.params.pedidoId);
    const token = crypto.randomBytes(16).toString("hex"); // 32 chars hex

    await q(
      `UPDATE Pedido
       SET qr_codigo = @token, qr_generado = 1
       WHERE pedido_id = @pid`,
      { token, pid: pedidoId }
    );

    res.json({ ok: true, qr_codigo: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
