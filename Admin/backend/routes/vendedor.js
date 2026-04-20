const express = require("express");
const router = express.Router();
const { q } = require("../db");

// Middleware to parse JSON is already in server.js
// requireAuth is also applied in server.js ideally or we can just assume it.
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
    // 1. Obtener info de usuario/empleado si es necesario, pero canal es local.
    // Creamos pedido como 'local' y tipo entrega 'local'.
    
    // Si requiere factura, validar e insertar en DatoFiscalCliente (o manejar a nivel bot)
    // Pero en nuestra base, Pedido acepta "whatsapp" NOT NULL.
    // Los pedidos locales podrían ser para un "mostrador" (ej. WA 0000000000).
    const wa = datos_fiscales?.whatsapp || "0000000000";

    // Si requirió factura explícitamente, registramos los datos fiscales primero.
    let dato_fiscal_id = null;
    if (requiere_factura && datos_fiscales) {
      // Necesitamos registrar dato fiscal. Aseguremos que exista el cliente fake si no existe.
      await q(
        `IF NOT EXISTS (SELECT 1 FROM Cliente WHERE whatsapp=@wa)
         BEGIN
           INSERT INTO Cliente (whatsapp, nombre) VALUES (@wa, @nom)
         END`, { wa, nom: clienteNombre || "Mostrador" }
      );

      const rfRes = await q(
        `INSERT INTO DatoFiscalCliente (whatsapp, rfc, razon_social, codigo_postal, regimen_id, es_predeterminado)
         OUTPUT INSERTED.dato_fiscal_id
         VALUES (@wa, @rfc, @rs, @cp, (SELECT regimen_id FROM RegimenFiscal WHERE clave=@reg), 1)`,
        { 
          wa, 
          rfc: datos_fiscales.rfc, 
          rs: datos_fiscales.razonSocial, 
          cp: datos_fiscales.codigoPostal, 
          reg: datos_fiscales.regimenClave || "616" 
        }
      );
      dato_fiscal_id = rfRes[0]?.dato_fiscal_id;
    }

    // 2. Insert Pedido principal
    // subtotal, iva se calculan en la iteración.
    let subtotal = 0;
    let iva = 0;

    for (let item of items) {
      subtotal += item.subtotal;
      // Cálculo simplificado de IVA para guardar rápido, aunque en POS ya viene calculado.
      // Aquí confiaremos en regenerarlo para seguridad usando query a DB.
    }

    // Usaremos un sp_CrearPedido manual o el existente del Bot?
    // Mejor lo hacemos manual aquí por ser POS.
    const invRes = await q(
      `INSERT INTO Pedido (
         whatsapp, tipo_pedido, tipo_entrega, metodo_pago_id, 
         estado_pago, requiere_factura, dato_fiscal_id, subtotal, iva, descuento,
         estado_pedido, codigo_entrega_sistema, entregado, canal,
         es_cotizacion, cotizacion_atendida, qr_generado, fecha_pedido
       ) OUTPUT INSERTED.pedido_id, INSERTED.folio
       VALUES (
         @wa, 'inmediato', 'local', @mp,
         'pagado', @rf, @dfid, 0, 0, 0,
         'creado', @codigo, 0, 'local',
         0, 0, 0, GETDATE()
       )`,
      {
        wa,
        mp: metodo_pago_id,
        rf: requiere_factura ? 1 : 0,
        dfid: dato_fiscal_id,
        codigo: clienteNombre.substring(0, 10) // Guardamos el nombre como identificador local
      }
    );

    const pedidoId = invRes[0].pedido_id;
    const folio = invRes[0].folio;

    // 3. Insert items
    let dbSubtotal = 0;
    let dbIva = 0;
    for (let item of items) {
       const pr = await q(`SELECT precio_actual, aplica_iva, tasa_iva FROM Producto WHERE producto_id=@id`, { id: item.producto_id });
       if (pr.length > 0) {
         const p = pr[0];
         const lineSubtotal = p.precio_actual * item.cantidad;
         const lineIva = p.aplica_iva ? lineSubtotal * p.tasa_iva : 0;
         dbSubtotal += lineSubtotal;
         dbIva += lineIva;

         await q(
           `INSERT INTO DetallePedido (pedido_id, producto_id, cantidad, precio_unitario, aplica_iva, iva_monto)
            VALUES (@pid, @prodid, @cant, @precio, @aplica, @ivamonto)`,
           {
             pid: pedidoId, prodid: item.producto_id, cant: item.cantidad,
             precio: p.precio_actual, aplica: p.aplica_iva ? 1 : 0, ivamonto: lineIva
           }
         );
       }
    }

    // 4. Actualizar totales del pedido
    await q(`UPDATE Pedido SET subtotal=@sub, iva=@iva WHERE pedido_id=@pid`, { sub: dbSubtotal, iva: dbIva, pid: pedidoId });

    // 5. Si requiere factura y es en efectivo (u otra forma si se soporta), disparamos webhook al bot
    if (requiere_factura && metodo_pago_id === 1) { // 1 = efectivo
       try {
         await fetch("http://localhost:3000/webhook/admin/venta_pos", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ pedido_id: pedidoId })
         });
       } catch (e) {
         console.warn("No se pudo notificar al bot para la factura:", e.message);
       }
    }

    res.json({ ok: true, pedido_id: pedidoId, folio, total: dbSubtotal + dbIva });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── 3. GET /pedidos_locales ──
router.get("/pedidos_locales", requireAuth, async (req, res) => {
  try {
    const rs = await q(
      `SELECT p.pedido_id, p.folio, p.fecha_pedido, p.total, p.codigo_entrega_sistema, p.estado_pedido
       FROM Pedido p 
       WHERE p.canal='local' AND p.estado_pedido != 'entregado'
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
      `SELECT pedido_id, folio, total, qr_codigo, fecha_pedido, estado_pedido
       FROM Pedido 
       WHERE tipo_entrega='domicilio' AND estado_pedido NOT IN ('entregado','cancelado')
       ORDER BY fecha_pedido ASC`
    );
    res.json(rs.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/pedidos_tienda", requireAuth, async (req, res) => {
  try {
    const rs = await q(
      `SELECT p.pedido_id, p.folio, p.total, p.codigo_entrega_sistema, p.fecha_pedido, p.estado_pedido, c.nombre AS cliente_nombre, ISNULL(c.apellidos, '') AS cliente_apellidos
       FROM Pedido p JOIN Cliente c ON p.whatsapp = c.whatsapp
       WHERE p.tipo_entrega='tienda' AND p.estado_pedido NOT IN ('entregado','cancelado')
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
