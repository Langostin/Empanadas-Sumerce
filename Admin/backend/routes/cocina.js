// backend/routes/cocina.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { q, sql } = require("../db");
const { requireRole } = require("../middleware/requireAuth");

const router = express.Router();

// Acceso permitido a administrador y cocina
const kitchenAccess = requireRole("administrador", "cocina");
const adminOnly     = requireRole("administrador");

// ══════════════════════════════════════════════════════════════
//  COLA DE COCINA — pedidos activos en tiempo real
// ══════════════════════════════════════════════════════════════
router.get("/cola", kitchenAccess, async (_, res) => {
  try {
    const r = await q(
      `SELECT
         p.pedido_id,
         p.folio,
         p.fecha_pedido,
         p.tipo_entrega,
         p.tipo_pedido,
         p.estado_pedido,
         ec.estado                            AS estado_cocina,
         ec.estado_cocina_id,
         ec.fecha_inicio,
         ec.empleado_cocina_id,
         -- Minutos en cola desde que llegó el pedido
         DATEDIFF(MINUTE, p.fecha_pedido, GETDATE()) AS minutos_en_cola,
         -- Empleado de cocina asignado
         ISNULL(emp.nombre + ' ' + ISNULL(emp.apellidos,''), NULL) AS cocinero,
         -- Productos del pedido (agregados)
         STRING_AGG(
           CAST(dp.cantidad AS VARCHAR) + 'x ' + pr.nombre, ', '
         ) WITHIN GROUP (ORDER BY pr.nombre) AS productos,
         -- Total de empanadas en el pedido
         SUM(dp.cantidad) AS total_empanadas,
         -- Dirección de entrega
         CASE
           WHEN p.tipo_entrega = 'domicilio' THEN
             ISNULL(dc.calle + ' ' + ISNULL(dc.numero_exterior,'') + ', ' + ISNULL(dc.colonia,''), 'Sin dirección')
           ELSE 'Recoger en tienda'
         END AS direccion_entrega,
         -- Nombre del cliente
         ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
         p.whatsapp,
         p.qr_codigo,
         p.codigo_entrega_sistema
       FROM Pedido p
       JOIN DetallePedido dp      ON p.pedido_id    = dp.pedido_id
       JOIN Producto pr           ON dp.producto_id = pr.producto_id
       LEFT JOIN EstadoCocina ec  ON p.pedido_id    = ec.pedido_id
       LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
       LEFT JOIN Cliente c        ON p.whatsapp     = c.whatsapp
       LEFT JOIN Empleado emp     ON ec.empleado_cocina_id = emp.empleado_id
       WHERE p.estado_pedido IN ('recibido', 'en_cocina')
       GROUP BY
         p.pedido_id, p.folio, p.fecha_pedido, p.tipo_entrega, p.tipo_pedido,
         p.estado_pedido, ec.estado, ec.estado_cocina_id, ec.fecha_inicio,
         ec.empleado_cocina_id,
         emp.nombre, emp.apellidos,
         dc.calle, dc.numero_exterior, dc.colonia,
         c.nombre, c.apellidos, p.whatsapp, p.qr_codigo, p.codigo_entrega_sistema
       ORDER BY p.fecha_pedido ASC`
    );

    // Resumen de la cola
    const resumen = await q(
      `SELECT
         COUNT(CASE WHEN p.estado_pedido = 'recibido'  THEN 1 END) AS pendientes,
         COUNT(CASE WHEN p.estado_pedido = 'en_cocina' THEN 1 END) AS en_proceso,
         ISNULL(SUM(dp.cantidad), 0) AS total_empanadas_pendientes
       FROM Pedido p
       JOIN DetallePedido dp ON p.pedido_id = dp.pedido_id
       WHERE p.estado_pedido IN ('recibido', 'en_cocina')`
    );

    res.json({ pedidos: r.recordset, resumen: resumen.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  DETALLE COMPLETO DE UN PEDIDO
// ══════════════════════════════════════════════════════════════
router.get("/pedidos/:id", kitchenAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [pedido, detalle, estadoCocina] = await Promise.all([
      q(`SELECT
           p.*, 
           ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
           mp.nombre AS metodo_pago,
           dc.calle, dc.numero_exterior, dc.colonia, dc.ciudad
         FROM Pedido p
         LEFT JOIN Cliente c ON p.whatsapp = c.whatsapp
         LEFT JOIN MetodoPago mp ON p.metodo_pago_id = mp.metodo_pago_id
         LEFT JOIN DireccionCliente dc ON p.direccion_id = dc.direccion_id
         WHERE p.pedido_id = @id`, { id }),
      q(`SELECT
           dp.detalle_id, dp.cantidad, dp.precio_unitario, dp.subtotal,
           pr.nombre AS producto, pr.descripcion
         FROM DetallePedido dp
         JOIN Producto pr ON dp.producto_id = pr.producto_id
         WHERE dp.pedido_id = @id`, { id }),
      q(`SELECT ec.*, 
           e.nombre + ' ' + ISNULL(e.apellidos,'') AS cocinero
         FROM EstadoCocina ec
         LEFT JOIN Empleado e ON ec.empleado_cocina_id = e.empleado_id
         WHERE ec.pedido_id = @id`, { id }),
    ]);

    res.json({
      pedido:       pedido.recordset[0],
      detalle:      detalle.recordset,
      estadoCocina: estadoCocina.recordset[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  CAMBIAR ESTADO DE UN PEDIDO EN COCINA
//  Transición: pendiente → en_proceso → terminado | cancelado
// ══════════════════════════════════════════════════════════════
router.patch("/pedidos/:id/estado", kitchenAccess, async (req, res) => {
  try {
    const pedidoId = parseInt(req.params.id);
    const { accion, observaciones } = req.body;
    const empleadoId = req.user.empleadoId;

    const TRANSICIONES = {
      aceptar: {
        estadoCocina: "en_proceso",
        estadoPedido: "en_cocina",
        setInicio: true,
      },
      listo: {
        estadoCocina: "terminado",
        estadoPedido: "listo",
        setFin: true,
      },
      cancelar: {
        estadoCocina: "cancelado",
        estadoPedido: "cancelado",
        setFin: true,
      },
    };

    const trans = TRANSICIONES[accion];
    if (!trans) {
      return res.status(400).json({
        error: "Acción inválida. Use: aceptar | listo | cancelar",
      });
    }

    // -------------------------
    // UPDATE EstadoCocina
    // -------------------------
    const sets = [
      "estado = @ec",
      "empleado_cocina_id = @emp",
    ];

    const params = {
      ec: trans.estadoCocina,
      emp: empleadoId,
      pid: pedidoId,
    };

    if (trans.setInicio) sets.push("fecha_inicio = GETDATE()");
    if (trans.setFin) sets.push("fecha_fin = GETDATE()");
    if (observaciones) {
      sets.push("observaciones = @obs");
      params.obs = observaciones;
    }

    await q(
      `UPDATE EstadoCocina SET ${sets.join(", ")} WHERE pedido_id = @pid`,
      params
    );

    // -------------------------
    // UPDATE Pedido
    // -------------------------
    await q(
      `UPDATE Pedido 
       SET estado_pedido = @ep 
       WHERE pedido_id = @pid`,
      {
        ep: trans.estadoPedido,
        pid: pedidoId,
      }
    );

    // -------------------------
    // 🚚 ASIGNAR REPARTIDOR Y GENERAR QR SI ESTÁ LISTO
    // -------------------------
    if (accion === "listo") {
      // Generar código QR (UUID)
      const qrCodigo = uuidv4();

      const repartidorRes = await q(`
        SELECT TOP 1 empleado_id
        FROM Empleado
        WHERE rol_id = 3 AND activo = 1
        ORDER BY ultima_sesion ASC
      `);

      const repartidor = repartidorRes.recordset[0];

      if (repartidor) {
        await q(
          `UPDATE Pedido
           SET repartidor_id = @rid, qr_codigo = @qr, qr_generado = 1
           WHERE pedido_id = @pid`,
          {
            rid: repartidor.empleado_id,
            qr: qrCodigo,
            pid: pedidoId,
          }
        );
      } else {
        // Aunque no haya repartidor disponible, generamos el QR
        await q(
          `UPDATE Pedido
           SET qr_codigo = @qr, qr_generado = 1
           WHERE pedido_id = @pid`,
          {
            qr: qrCodigo,
            pid: pedidoId,
          }
        );
      }
    }

    // -------------------------
    // LOG SISTEMA
    // -------------------------
    await q(
      `INSERT INTO LogSistema (nivel, modulo, accion, pedido_id, empleado_id, detalle)
       VALUES ('INFO', 'cocina', @acc, @pid, @emp, @det)`,
      {
        acc: `cocina_${accion}`,
        pid: pedidoId,
        emp: empleadoId,
        det: JSON.stringify({
          accion,
          estado_cocina: trans.estadoCocina,
          estado_pedido: trans.estadoPedido,
          repartidor_asignado: accion === "listo",
        }),
      }
    );

    res.json({
      ok: true,
      nuevo_estado: trans.estadoPedido,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  MÉTRICAS DEL DÍA PARA EL PANEL DE COCINA
// ══════════════════════════════════════════════════════════════
router.get("/metricas/hoy", kitchenAccess, async (_, res) => {
  try {
    const [produccion, tiempos, capacidad, stockCritico] = await Promise.all([
      // Producción del día
      q(`SELECT
           COUNT(CASE WHEN p.estado_pedido = 'entregado' THEN 1 END) AS pedidos_entregados,
           COUNT(CASE WHEN p.estado_pedido = 'listo'     THEN 1 END) AS pedidos_listos,
           COUNT(CASE WHEN p.estado_pedido = 'en_cocina' THEN 1 END) AS pedidos_en_cocina,
           COUNT(CASE WHEN p.estado_pedido = 'recibido'  THEN 1 END) AS pedidos_pendientes,
           COUNT(CASE WHEN p.estado_pedido = 'cancelado' THEN 1 END) AS pedidos_cancelados,
           ISNULL(SUM(dp.cantidad), 0) AS empanadas_producidas
         FROM Pedido p
         JOIN DetallePedido dp ON p.pedido_id = dp.pedido_id
         WHERE CAST(p.fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)`),

      // Tiempo promedio de producción del día
      q(`SELECT
           ISNULL(AVG(DATEDIFF(MINUTE, ec.fecha_inicio, ec.fecha_fin)), 0) AS min_promedio_produccion,
           ISNULL(MIN(DATEDIFF(MINUTE, ec.fecha_inicio, ec.fecha_fin)), 0) AS min_mas_rapido,
           ISNULL(MAX(DATEDIFF(MINUTE, ec.fecha_inicio, ec.fecha_fin)), 0) AS min_mas_lento
         FROM EstadoCocina ec
         JOIN Pedido p ON ec.pedido_id = p.pedido_id
         WHERE CAST(p.fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)
           AND ec.estado = 'terminado'
           AND ec.fecha_inicio IS NOT NULL
           AND ec.fecha_fin IS NOT NULL`),

      // Capacidad diaria
      q(`SELECT limite_empanadas, empanadas_vendidas, acepta_pedidos, motivo_cierre
         FROM CapacidadDiaria
         WHERE fecha = CAST(GETDATE() AS DATE)`),

      // Insumos críticos relevantes para cocina (los que están en recetas)
      q(`SELECT COUNT(DISTINCT i.insumo_id) AS insumos_criticos
         FROM Insumo i
         JOIN RecetaProducto rp ON i.insumo_id = rp.insumo_id
         WHERE i.activo = 1 AND i.stock_actual <= i.stock_minimo`),
    ]);

    const cap = capacidad.recordset[0] || { limite_empanadas: null, empanadas_vendidas: 0, acepta_pedidos: true };

    res.json({
      produccion:     produccion.recordset[0],
      tiempos:        tiempos.recordset[0],
      capacidad:      cap,
      insumos_criticos: stockCritico.recordset[0].insumos_criticos,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  INSUMOS CRÍTICOS QUE AFECTAN RECETAS ACTIVAS
// ══════════════════════════════════════════════════════════════
router.get("/insumos-criticos", kitchenAccess, async (_, res) => {
  try {
    const r = await q(
      `SELECT DISTINCT
         i.insumo_id,
         i.nombre                         AS insumo,
         i.stock_actual,
         i.stock_minimo,
         um.clave                         AS unidad,
         ROUND(i.stock_actual - i.stock_minimo, 3) AS diferencia,
         p.nombre                         AS proveedor,
         p.telefono                       AS tel_proveedor,
         CASE
           WHEN i.stock_actual <= 0              THEN 'agotado'
           ELSE 'critico'
         END AS nivel,
         -- Qué productos se ven afectados
         STRING_AGG(pr.nombre, ', ')
           WITHIN GROUP (ORDER BY pr.nombre) AS productos_afectados
       FROM Insumo i
       JOIN RecetaProducto rp ON i.insumo_id = rp.insumo_id
       JOIN Producto pr       ON rp.producto_id = pr.producto_id
       JOIN UnidadMedida um   ON i.unidad_id = um.unidad_id
       LEFT JOIN Proveedor p  ON i.proveedor_id = p.proveedor_id
       WHERE i.activo = 1
         AND i.stock_actual <= i.stock_minimo
       GROUP BY
         i.insumo_id, i.nombre, i.stock_actual, i.stock_minimo, um.clave,
         p.nombre, p.telefono
       ORDER BY (i.stock_actual - i.stock_minimo)`
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  HISTORIAL DE PRODUCCIÓN DEL DÍA (pedidos terminados hoy)
// ══════════════════════════════════════════════════════════════
router.get("/historial/hoy", kitchenAccess, async (_, res) => {
  try {
    const r = await q(
      `SELECT
         p.pedido_id,
         p.folio,
         p.tipo_entrega,
         p.estado_pedido,
         ec.estado                           AS estado_cocina,
         ec.fecha_inicio,
         ec.fecha_fin,
         DATEDIFF(MINUTE, ec.fecha_inicio, ec.fecha_fin) AS minutos_produccion,
         ISNULL(e.nombre + ' ' + ISNULL(e.apellidos,''), 'Sin asignar') AS cocinero,
         STRING_AGG(
           CAST(dp.cantidad AS VARCHAR) + 'x ' + pr.nombre, ', '
         ) WITHIN GROUP (ORDER BY pr.nombre) AS productos,
         SUM(dp.cantidad) AS total_empanadas,
         p.fecha_pedido
       FROM Pedido p
       JOIN DetallePedido dp      ON p.pedido_id    = dp.pedido_id
       JOIN Producto pr           ON dp.producto_id = pr.producto_id
       LEFT JOIN EstadoCocina ec  ON p.pedido_id    = ec.pedido_id
       LEFT JOIN Empleado e       ON ec.empleado_cocina_id = e.empleado_id
       WHERE CAST(p.fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)
         AND p.estado_pedido IN ('listo', 'en_camino', 'entregado')
       GROUP BY
         p.pedido_id, p.folio, p.tipo_entrega, p.estado_pedido,
         ec.estado, ec.fecha_inicio, ec.fecha_fin,
         e.nombre, e.apellidos, p.fecha_pedido
       ORDER BY ec.fecha_fin DESC`
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  COCINEROS DISPONIBLES (para asignar a pedidos)
// ══════════════════════════════════════════════════════════════
router.get("/cocineros", kitchenAccess, async (_, res) => {
  try {
    const r = await q(
      `SELECT empleado_id, nombre, apellidos, telefono_whatsapp
       FROM Empleado
       WHERE rol_id = 2 AND activo = 1
       ORDER BY nombre`
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


//mermas

// LISTADO DE MERMAS
router.get("/mermas", kitchenAccess, async (_, res) => {
  try {
const r = await q(`
SELECT
  m.merma_id,
  COALESCE(i.nombre, p.nombre) AS nombre,
  CASE 
    WHEN m.insumo_id IS NOT NULL THEN 'insumo'
    WHEN m.producto_id IS NOT NULL THEN 'producto'
  END AS tipo,
  m.cantidad,
  m.tipo_merma,
  m.motivo,
  m.costo_total,
  m.fecha
FROM Merma m
LEFT JOIN Insumo i ON m.insumo_id = i.insumo_id
LEFT JOIN Producto p ON m.producto_id = p.producto_id
ORDER BY m.fecha DESC
`);

    res.json(r.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MÉTRICAS DE MERMAS DEL DÍA
router.get("/mermas/metricas/hoy", kitchenAccess, async (_, res) => {
  try {
    const r = await q(`
      SELECT
        COUNT(*) AS total_mermas,
        ISNULL(SUM(cantidad), 0) AS unidades,
        ISNULL(SUM(costo_total), 0) AS perdida
      FROM Merma
      WHERE DATEDIFF(DAY, fecha, GETDATE()) = 0
    `);

    res.json(r.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/insumos", kitchenAccess, async (_, res) => {
  try {
    const r = await q(`
      SELECT insumo_id AS id, nombre, 'insumo' AS tipo
      FROM Insumo
      WHERE activo = 1

      UNION ALL

      SELECT producto_id AS id, nombre, 'producto' AS tipo
      FROM Producto
      WHERE activo = 1

      ORDER BY nombre
    `);

    res.json(r.recordset);
  } catch (err) {
    console.error("ERROR INSUMOS:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/mermas", kitchenAccess, async (req, res) => {
  try {
    const { insumo_id, producto_id, cantidad, tipo_merma, motivo } = req.body;

    // ✅ VALIDACIÓN CORRECTA
    if ((!insumo_id && !producto_id) || !cantidad || !tipo_merma) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const empleado_id = req.user.empleadoId;

    let costo_unitario = 0;
    let costo_total = 0;

    // =====================================
    // 🔥 CASO 1: ES INSUMO
    // =====================================
    if (insumo_id) {
      const r = await q(
        `SELECT stock_actual, costo_unitario
         FROM Insumo
         WHERE insumo_id = @id`,
        { id: insumo_id }
      );

      const insumo = r.recordset[0];

      if (!insumo) {
        return res.status(404).json({ error: "Insumo no encontrado" });
      }

      if (insumo.stock_actual < cantidad) {
        return res.status(400).json({
          error: "No hay suficiente stock para registrar la merma",
        });
      }

      costo_unitario = insumo.costo_unitario;
      costo_total = cantidad * costo_unitario;

      // 🔥 descontar stock
      await q(
        `UPDATE Insumo
         SET stock_actual = stock_actual - @cantidad
         WHERE insumo_id = @id`,
        { cantidad, id: insumo_id }
      );
    }

    // =====================================
    // 🔥 CASO 2: ES PRODUCTO (EMPANADA)
    // =====================================
    if (producto_id) {
      const r = await q(
        `SELECT precio_actual
         FROM Producto
         WHERE producto_id = @id`,
        { id: producto_id }
      );

      const producto = r.recordset[0];

      if (!producto) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      // 🔥 usamos precio como costo (puedes cambiarlo después)
      costo_unitario = producto.precio_actual;
      costo_total = cantidad * costo_unitario;
    }

    // =====================================
    // 🔥 INSERT MERMA
    // =====================================
    await q(
      `INSERT INTO Merma (
        insumo_id,
        producto_id,
        cantidad,
        tipo_merma,
        motivo,
        costo_unitario,
        costo_total,
        empleado_id
      )
      VALUES (
        @insumo_id,
        @producto_id,
        @cantidad,
        @tipo_merma,
        @motivo,
        @costo_unitario,
        @costo_total,
        @empleado_id
      )`,
      {
        insumo_id: insumo_id || null,
        producto_id: producto_id || null,
        cantidad,
        tipo_merma,
        motivo: motivo || null,
        costo_unitario,
        costo_total,
        empleado_id,
      }
    );

    // =====================================
    // 🔥 LOG
    // =====================================
    await q(
      `INSERT INTO LogSistema (nivel, modulo, accion, empleado_id, detalle)
       VALUES ('WARN', 'mermas', 'registro_merma', @emp, @det)`,

      {
        emp: empleado_id,
        det: JSON.stringify({
          insumo_id,
          producto_id,
          cantidad,
          tipo_merma,
          costo_total,
        }),
      }
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("ERROR MERMAS:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;