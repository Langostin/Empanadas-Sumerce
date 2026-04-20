// backend/server.js
const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const { q } = require("./db");
const authRouter = require("./routes/auth");
const inventarioRouter = require("./routes/inventario");
const cocinaRouter      = require("./routes/cocina");
const repartidorRouter  = require("./routes/repartidor");
const { requireAuth, requireRole } = require("./middleware/requireAuth");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Socket.io middleware to accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ══════════════════════════════════════════════════════════════
//  AUTH — rutas públicas
// ══════════════════════════════════════════════════════════════
app.use("/api/auth", authRouter);

// ── A partir de aquí, todas las rutas requieren JWT ───────────
app.use("/api", requireAuth);

// ── Sub-routers protegidos ─────────────────────────────────────
app.use("/api/inventario", inventarioRouter);

app.use("/api/cocina",      cocinaRouter);
app.use("/api/repartidor",  repartidorRouter);
app.use("/api/vendedor",    require("./routes/vendedor"));
// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
app.get("/api/dashboard/metricas", requireRole("administrador"), async (_, res) => {
  try {
    const [clientes, empleados, pedidos, eventos, ingresos, topClientes, ventasMes] =
      await Promise.all([
        q(`SELECT COUNT(*) AS total FROM Cliente WHERE activo = 1`),
        q(`SELECT COUNT(*) AS total FROM Empleado WHERE activo = 1`),
        q(`SELECT COUNT(*) AS total FROM Pedido WHERE estado_pedido NOT IN ('cancelado')`),
        q(`SELECT COUNT(*) AS total FROM Pedido WHERE tipo_pedido = 'evento' AND estado_pedido NOT IN ('cancelado')`),
        q(`SELECT ISNULL(SUM(total), 0) AS total FROM Pedido WHERE estado_pedido = 'entregado'`),
        q(`SELECT TOP 5 c.whatsapp, ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), c.whatsapp) AS nombre,
                  c.total_pedidos, c.total_gastado
           FROM Cliente c ORDER BY c.total_gastado DESC`),
        q(`SELECT MONTH(fecha_pedido) AS mes, COUNT(*) AS pedidos, ISNULL(SUM(total),0) AS ingresos
           FROM Pedido
           WHERE YEAR(fecha_pedido) = YEAR(GETDATE()) AND estado_pedido NOT IN ('cancelado')
           GROUP BY MONTH(fecha_pedido) ORDER BY mes`),
      ]);
    res.json({
      totalClientes:  clientes.recordset[0].total,
      totalEmpleados: empleados.recordset[0].total,
      totalPedidos:   pedidos.recordset[0].total,
      totalEventos:   eventos.recordset[0].total,
      totalIngresos:  ingresos.recordset[0].total,
      topClientes:    topClientes.recordset,
      ventasMes:      ventasMes.recordset,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/dashboard/estados-pedido", requireRole("administrador"), async (_, res) => {
  try {
    const r = await q(`SELECT estado_pedido AS estado, COUNT(*) AS total FROM Pedido GROUP BY estado_pedido`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/dashboard/hoy", requireRole("administrador"), async (_, res) => {
  try {
    const r = await q(
      `SELECT ISNULL(COUNT(*),0) AS pedidos,
              ISNULL(SUM(total),0) AS ingresos,
              ISNULL(SUM(CASE WHEN metodo_pago_id=1 THEN total ELSE 0 END),0) AS efectivo,
              ISNULL(SUM(CASE WHEN metodo_pago_id IN(2,3) THEN total ELSE 0 END),0) AS tarjeta
       FROM Pedido
       WHERE CAST(fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)
         AND estado_pedido NOT IN ('cancelado')`
    );
    res.json(r.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════════════════════════════
app.get("/api/clientes", requireRole("administrador"), async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const r = await q(
      `SELECT c.whatsapp,
              ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), '(Sin nombre)') AS nombre_completo,
              c.nombre, c.apellidos, c.email, c.genero,
              c.total_pedidos, c.total_gastado, c.activo,
              c.fecha_creacion, c.sesion_estado,
              ISNULL(c.bloqueo_sordo, 0) AS bloqueo_sordo,
              ISNULL(c.bloqueo_ia, 0)    AS bloqueo_ia
       FROM Cliente c
       WHERE (@s = '' OR c.whatsapp LIKE '%' + @s + '%'
           OR ISNULL(c.nombre,'') LIKE '%' + @s + '%'
           OR ISNULL(c.apellidos,'') LIKE '%' + @s + '%')
       ORDER BY c.fecha_creacion DESC
       OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
      { s: search, off: offset, lim: parseInt(limit) }
    );
    const count = await q(
      `SELECT COUNT(*) AS total FROM Cliente c
       WHERE (@s = '' OR c.whatsapp LIKE '%' + @s + '%'
           OR ISNULL(c.nombre,'') LIKE '%' + @s + '%')`,
      { s: search }
    );
    res.json({ data: r.recordset, total: count.recordset[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/clientes/:whatsapp/metricas", requireRole("administrador"), async (req, res) => {
  try {
    const wa = decodeURIComponent(req.params.whatsapp);
    const [cliente, pedidos, ultimoPedido] = await Promise.all([
      q(`SELECT * FROM Cliente WHERE whatsapp = @wa`, { wa }),
      q(`SELECT estado_pedido, COUNT(*) AS total, ISNULL(SUM(total),0) AS monto FROM Pedido WHERE whatsapp = @wa GROUP BY estado_pedido`, { wa }),
      q(`SELECT TOP 5 pedido_id, folio, fecha_pedido, total, estado_pedido, tipo_pedido FROM Pedido WHERE whatsapp = @wa ORDER BY fecha_pedido DESC`, { wa }),
    ]);
    res.json({ cliente: cliente.recordset[0], pedidosPorEstado: pedidos.recordset, ultimosPedidos: ultimoPedido.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/api/clientes/:whatsapp/estado", requireRole("administrador"), async (req, res) => {
  try {
    const wa = decodeURIComponent(req.params.whatsapp);
    const { activo, bloqueo_sordo, bloqueo_ia } = req.body;
    const sets = [], params = { wa };
    if (activo        !== undefined) { sets.push("activo = @activo");    params.activo = activo ? 1 : 0; }
    if (bloqueo_sordo !== undefined) { sets.push("bloqueo_sordo = @bs"); params.bs = bloqueo_sordo ? 1 : 0; }
    if (bloqueo_ia    !== undefined) { sets.push("bloqueo_ia = @bi");    params.bi = bloqueo_ia ? 1 : 0; }
    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });
    await q(`UPDATE Cliente SET ${sets.join(", ")} WHERE whatsapp = @wa`, params);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
//  EMPLEADOS
// ══════════════════════════════════════════════════════════════
app.get("/api/empleados", requireRole("administrador"), async (req, res) => {
  try {
    const { search = "" } = req.query;
    const r = await q(
      `SELECT e.empleado_id, e.nombre, e.apellidos, e.email, e.telefono_whatsapp,
              e.sueldo_mensual, e.activo, e.fecha_alta, e.username, e.ultima_sesion,
              r.rol_id, r.nombre AS rol
       FROM Empleado e JOIN Rol r ON e.rol_id = r.rol_id
       WHERE @s = '' OR e.nombre LIKE '%'+@s+'%' OR e.apellidos LIKE '%'+@s+'%'
       ORDER BY e.fecha_alta DESC`,
      { s: search }
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/empleados/:id/metricas", requireRole("administrador"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [empleado, pedidosRepartidos, gastos] = await Promise.all([
      q(`SELECT e.*, r.nombre AS rol FROM Empleado e JOIN Rol r ON e.rol_id=r.rol_id WHERE e.empleado_id=@id`, { id }),
      q(`SELECT COUNT(*) AS total, ISNULL(SUM(p.total),0) AS monto FROM Pedido p WHERE p.repartidor_id=@id AND p.estado_pedido='entregado'`, { id }),
      q(`SELECT ISNULL(SUM(monto),0) AS total FROM GastoOperativo WHERE empleado_id=@id`, { id }),
    ]);
    res.json({ empleado: empleado.recordset[0], pedidosRepartidos: pedidosRepartidos.recordset[0], gastos: gastos.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/empleados", requireRole("administrador"), async (req, res) => {
  try {
    const { nombre, apellidos, email, telefono_whatsapp, sueldo_mensual, rol_id, username, contrasena } = req.body;
    const hash = await bcrypt.hash(contrasena, 12);
    const r = await q(
      `INSERT INTO Empleado (rol_id, nombre, apellidos, email, telefono_whatsapp, sueldo_mensual, username, password_hash)
       OUTPUT INSERTED.empleado_id
       VALUES (@rid, @nom, @ape, @email, @tel, @sueldo, @user, @hash)`,
      { rid: rol_id, nom: nombre, ape: apellidos, email, tel: telefono_whatsapp, sueldo: sueldo_mensual, user: username, hash: hash }
    );
    res.json({ empleado_id: r.recordset[0].empleado_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/empleados/:id", requireRole("administrador"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const {
      nombre,
      apellidos,
      email,
      telefono_whatsapp,
      sueldo_mensual,
      rol_id,
      activo,
      contrasena
    } = req.body;

    let hash = null;
    if (contrasena) {
      hash = await bcrypt.hash(contrasena, 12);
    }

    let query = `
      UPDATE Empleado SET 
        nombre=@nom,
        apellidos=@ape,
        email=@email,
        telefono_whatsapp=@tel,
        sueldo_mensual=@sueldo,
        rol_id=@rid
    `;

    const params = {
      id,
      nom: nombre,
      ape: apellidos,
      email,
      tel: telefono_whatsapp,
      sueldo: sueldo_mensual,
      rid: rol_id,
    };

    if (activo !== undefined) {
      query += `, activo=@activo`;
      params.activo = activo ? 1 : 0;
    }

    if (hash) {
      query += `, password_hash=@hash`;
      params.hash = hash;
    }

    query += ` WHERE empleado_id=@id`;

    await q(query, params);

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/empleados/:id", requireRole("administrador"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await q(`UPDATE Empleado SET activo=0, fecha_baja=CAST(GETDATE() AS DATE) WHERE empleado_id=@id`, { id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/roles", async (_, res) => {
  try {
    const r = await q(`SELECT rol_id, nombre FROM Rol ORDER BY rol_id`);
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Redundant Kitchen routes removed (already handled in routes/cocina.js) ──

// ══════════════════════════════════════════════════════════════
//  PEDIDOS
// ══════════════════════════════════════════════════════════════
app.get("/api/pedidos", requireRole("administrador", "cocina", "repartidor"), async (req, res) => {
  try {
    const { estado, tipo, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const r = await q(
      `SELECT p.pedido_id, p.folio, p.whatsapp,
              ISNULL(c.nombre + ' ' + ISNULL(c.apellidos,''), p.whatsapp) AS cliente,
              p.tipo_pedido, p.tipo_entrega, p.estado_pedido, p.estado_pago,
              p.total, p.fecha_pedido, p.canal, mp.nombre AS metodo_pago
       FROM Pedido p
       LEFT JOIN Cliente c    ON p.whatsapp      = c.whatsapp
       LEFT JOIN MetodoPago mp ON p.metodo_pago_id = mp.metodo_pago_id
       WHERE (@est = '' OR p.estado_pedido = @est)
         AND (@tipo = '' OR p.tipo_pedido  = @tipo)
       ORDER BY p.fecha_pedido DESC
       OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
      { est: estado || "", tipo: tipo || "", off: offset, lim: parseInt(limit) }
    );
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`✅ Servidor con WebSockets en http://localhost:${PORT}`));