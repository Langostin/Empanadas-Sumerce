const express = require("express");
const router = express.Router();
const { q } = require("../db");

// Middleware to parse JSON is already in server.js
const { requireAuth } = require("../middleware/requireAuth");

// ── 1. GET /productos ──
router.get("/productos", requireAuth, async (req, res) => {
  try {
    const rs = await q(`SELECT producto_id, nombre, precio_actual, aplica_iva, tasa_iva FROM Producto WHERE activo=1`);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 2. POST /crear_venta ──
router.post("/crear_venta", requireAuth, async (req, res) => {
  const { clienteNombre, items, metodo_pago_id, requiere_factura, efectivo_recibido, datos_fiscales } = req.body;
  const usuario_id = req.user.id; // Del payload JWT
  
  if (!items || items.length === 0) return res.status(400).json({ error: "Carrito vacío" });

  try {
    // 1. Validar datos mínimos
    if (!clienteNombre || !clienteNombre.trim()) {
      return res.status(400).json({ error: "Nombre de cliente requerido" });
    }

    const wa = datos_fiscales?.whatsapp || "0000000000";

    // 2. Asegurar que existe el cliente
    await q(
      `IF NOT EXISTS (SELECT 1 FROM Cliente WHERE whatsapp=@wa)
       BEGIN
         INSERT INTO Cliente (whatsapp, nombre) VALUES (@wa, @nom)
       END`,
      { wa, nom: clienteNombre }
    );

    // 3. Registrar datos fiscales si es requerido
    let dato_fiscal_id = null;
    if (requiere_factura && datos_fiscales) {
      const rfRes = await q(
        `INSERT INTO DatoFiscalCliente (whatsapp, rfc, razon_social, codigo_postal, regimen_id, es_predeterminado)
         OUTPUT INSERTED.dato_fiscal_id
         VALUES (@wa, @rfc, @rs, @cp, (SELECT regimen_id FROM RegimenFiscal WHERE clave=@reg), 1)`,
        { 
          wa, 
          rfc: (datos_fiscales.rfc || "").substring(0, 13).trim(), 
          rs: (datos_fiscales.razonSocial || clienteNombre).substring(0, 255), 
          cp: (datos_fiscales.codigoPostal || "00000").substring(0, 10), 
          reg: datos_fiscales.regimenClave || "616" 
        }
      );
      dato_fiscal_id = rfRes.recordset[0]?.dato_fiscal_id;
    }

    // 4. Calcular totales de items
    let dbSubtotal = 0;
    let dbIva = 0;
    const detalles = [];

    for (let item of items) {
      const pr = await q(
        `SELECT precio_actual, aplica_iva, tasa_iva FROM Producto WHERE producto_id=@id`, 
        { id: item.producto_id }
      );
      
      if (pr.recordset.length > 0) {
        const p = pr.recordset[0];
        const lineSubtotal = p.precio_actual * item.cantidad;
        const lineIva = p.aplica_iva ? lineSubtotal * p.tasa_iva : 0;
        dbSubtotal += lineSubtotal;
        dbIva += lineIva;
        
        detalles.push({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: p.precio_actual,
          aplica_iva: p.aplica_iva ? 1 : 0,
          iva_monto: lineIva
        });
      }
    }

    const total = dbSubtotal + dbIva;

    // 5. Crear pedido
    const invRes = await q(
      `INSERT INTO Pedido (
         whatsapp, tipo_pedido, tipo_entrega, metodo_pago_id, 
         estado_pago, requiere_factura, dato_fiscal_id, subtotal, iva, descuento,
         estado_pedido, codigo_entrega_sistema, entregado, canal,
         es_cotizacion, cotizacion_atendida, fecha_pedido
       ) OUTPUT INSERTED.pedido_id, INSERTED.folio
       VALUES (
         @wa, 'individual', 'tienda', @mp,
         'pagado', @rf, @dfid, @sub, @iva, 0,
         'recibido', @codigo, 0, 'presencial',
         0, 0, GETDATE()
       )`,
      {
        wa,
        mp: metodo_pago_id || 1,
        rf: requiere_factura ? 1 : 0,
        dfid: dato_fiscal_id,
        sub: dbSubtotal,
        iva: dbIva,
        codigo: clienteNombre.substring(0, 6).toUpperCase()
      }
    );

    const pedidoId = invRes.recordset[0].pedido_id;
    const folio = invRes.recordset[0].folio;

    // 5.5. Actualizar total_gastado y total_pedidos del cliente
    await q(
      `UPDATE Cliente SET total_gastado = total_gastado + @total, total_pedidos = total_pedidos + 1 WHERE whatsapp = @wa`,
      { wa, total }
    );

    // 6. Insertar detalles del pedido
    for (let det of detalles) {
      await q(
        `INSERT INTO DetallePedido (pedido_id, producto_id, cantidad, precio_unitario, aplica_iva, iva_monto)
         VALUES (@pid, @prodid, @cant, @precio, @aplica, @ivamonto)`,
        {
          pid: pedidoId,
          prodid: det.producto_id,
          cant: det.cantidad,
          precio: det.precio_unitario,
          aplica: det.aplica_iva,
          ivamonto: det.iva_monto
        }
      );
    }

    // 7. Webhook para factura si aplica (enviar al bot Baileys)
    if (requiere_factura) {
      try {
        await fetch("http://localhost:3000/webhook/admin/venta_pos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedido_id: pedidoId })
        });
      } catch (e) {
        console.warn("⚠️ No se pudo notificar al bot para factura:", e.message);
      }
    }

    // Emitir evento por WebSockets para Cocina
    req.io.emit("pedido_nuevo", { pedido_id: pedidoId, folio });

    res.json({ ok: true, pedido_id: pedidoId, folio, total: dbSubtotal + dbIva });
  } catch (err) {
    console.error("❌ ERROR en crear_venta:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── 3. GET /pedidos_locales ──
router.get("/pedidos_locales", requireAuth, async (req, res) => {
  try {
    const rs = await q(
      `SELECT p.pedido_id, p.folio, p.fecha_pedido, ISNULL(p.subtotal + p.iva, 0) AS total, p.codigo_entrega_sistema, p.estado_pedido
       FROM Pedido p 
       WHERE p.canal='presencial' AND p.estado_pedido = 'listo'
       ORDER BY p.fecha_pedido DESC`
    );
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. POST /confirmar_local ──
router.post("/confirmar_local", requireAuth, async (req, res) => {
  const { pedido_id } = req.body;
  try {
    await q(
      `UPDATE Pedido SET estado_pedido='entregado', entregado=1, fecha_entrega_real=GETDATE()
       WHERE pedido_id=@pid`, { pid: pedido_id }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. GET /pedidos_domicilio y tienda (Re-utilizados para Vendedor Tablero) ──
router.get("/pedidos_domicilio", requireAuth, async (req, res) => {
  try {
    const rs = await q(
      `SELECT p.pedido_id, p.folio, p.total, p.qr_codigo, p.repartidor_id, p.fecha_pedido, p.estado_pedido, c.nombre AS cliente_nombre, ISNULL(c.apellidos, '') AS cliente_apellidos, d.calle, d.numero_exterior, d.colonia
       FROM Pedido p 
       LEFT JOIN Cliente c ON p.whatsapp = c.whatsapp
       LEFT JOIN DireccionCliente d ON p.direccion_id = d.direccion_id
       WHERE p.tipo_entrega='domicilio' AND p.estado_pedido = 'listo'
       ORDER BY p.fecha_pedido ASC`
    );
    res.json(rs.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/pedidos_tienda", requireAuth, async (req, res) => {
  try {
    const rs = await q(
      `SELECT p.pedido_id, p.folio, p.total, p.codigo_entrega_sistema, p.fecha_pedido, p.estado_pedido, c.nombre AS cliente_nombre, ISNULL(c.apellidos, '') AS cliente_apellidos
       FROM Pedido p JOIN Cliente c ON p.whatsapp = c.whatsapp
       WHERE p.tipo_entrega='tienda' AND p.estado_pedido = 'listo'
       ORDER BY p.fecha_pedido ASC`
    );
    res.json(rs.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 6. POST /confirmar_tienda ──
router.post("/confirmar_tienda", requireAuth, async (req, res) => {
  const { codigo } = req.body;
  try {
     const rs = await q(
       `SELECT pedido_id, folio FROM Pedido 
        WHERE codigo_entrega_sistema=@codigo 
          AND tipo_entrega='tienda' 
          AND estado_pedido NOT IN ('entregado','cancelado')`, 
       { codigo }
     );
     if (rs.recordset.length === 0) {
       return res.status(400).json({ error: "Código inválido o pedido previamente entregado." });
     }
     
     const p = rs.recordset[0];
     await q(
       `UPDATE Pedido 
        SET estado_pedido='entregado', entregado=1, fecha_entrega_real=GETDATE(), codigo_entrega_repartidor=@codigo 
        WHERE pedido_id=@pid`, 
       { pid: p.pedido_id, codigo }
     );
     
     // Webhook (Bot)
     try {
       await fetch("http://localhost:3000/webhook/admin/entregado", { 
         method:"POST", 
         headers:{"Content-Type":"application/json"}, 
         body:JSON.stringify({pedido_id: p.pedido_id}) 
       });
     } catch(e){}

     res.json({ ok: true });
  } catch (err) {
     res.status(500).json({ error: err.message });
  }
});

module.exports = router;
