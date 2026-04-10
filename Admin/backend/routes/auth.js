// backend/routes/auth.js
const express  = require("express");
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const nodemailer = require("nodemailer");
const { q }    = require("../db");

const router = express.Router();

const JWT_SECRET          = process.env.JWT_SECRET || "cambia_esto_en_produccion_s3cr3t0";
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN || "8h";
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// ──────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────
function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function signRefresh(payload) {
  return jwt.sign(payload, JWT_SECRET + "_refresh", { expiresIn: JWT_REFRESH_EXPIRES });
}

/** Transportador de correo — configura en .env */
function getMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

// ──────────────────────────────────────────────
//  POST /api/auth/login
// ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos." });
  }

  try {
    // Buscar empleado activo por username o email
    const result = await q(
      `SELECT e.empleado_id, e.nombre, e.apellidos, e.email,
              e.username, e.password_hash, e.activo,
              e.telefono_whatsapp,
              r.rol_id, r.nombre AS rol
       FROM Empleado e
       JOIN Rol r ON e.rol_id = r.rol_id
       WHERE (e.username = @u OR e.email = @u)
         AND e.activo = 1`,
      { u: username.trim() }
    );

    const empleado = result.recordset[0];

    if (!empleado) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    // Verificar contraseña con bcrypt
    const valid = await bcrypt.compare(password, empleado.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    // Construir payload del token
    const tokenPayload = {
      empleadoId: empleado.empleado_id,
      username:   empleado.username,
      nombre:     empleado.nombre,
      apellidos:  empleado.apellidos,
      email:      empleado.email,
      rol:        empleado.rol,
      rolId:      empleado.rol_id,
    };

    const accessToken  = signToken(tokenPayload);
    const refreshToken = signRefresh({ empleadoId: empleado.empleado_id });

    // Actualizar última sesión
    await q(
      `UPDATE Empleado SET ultima_sesion = GETDATE() WHERE empleado_id = @id`,
      { id: empleado.empleado_id }
    );

    // Log
    await q(
      `INSERT INTO LogSistema (nivel, modulo, accion, empleado_id, detalle)
       VALUES ('INFO', 'auth', 'login_exitoso', @id, @det)`,
      {
        id:  empleado.empleado_id,
        det: JSON.stringify({ username: empleado.username, rol: empleado.rol }),
      }
    ).catch(() => {}); // silencioso

    res.json({
      accessToken,
      refreshToken,
      user: {
        empleadoId: empleado.empleado_id,
        nombre:     empleado.nombre,
        apellidos:  empleado.apellidos,
        email:      empleado.email,
        username:   empleado.username,
        rol:        empleado.rol,
        rolId:      empleado.rol_id,
      },
    });
  } catch (err) {
    console.error("Error login:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ──────────────────────────────────────────────
//  POST /api/auth/refresh
//  Renueva el access token usando el refresh token
// ──────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido." });

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET + "_refresh");

    // Obtener datos actualizados del empleado
    const result = await q(
      `SELECT e.empleado_id, e.nombre, e.apellidos, e.email, e.username,
              r.rol_id, r.nombre AS rol
       FROM Empleado e JOIN Rol r ON e.rol_id = r.rol_id
       WHERE e.empleado_id = @id AND e.activo = 1`,
      { id: decoded.empleadoId }
    );

    const empleado = result.recordset[0];
    if (!empleado) return res.status(401).json({ error: "Sesión inválida." });

    const accessToken = signToken({
      empleadoId: empleado.empleado_id,
      username:   empleado.username,
      nombre:     empleado.nombre,
      apellidos:  empleado.apellidos,
      email:      empleado.email,
      rol:        empleado.rol,
      rolId:      empleado.rol_id,
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Refresh token inválido o expirado. Inicia sesión nuevamente." });
  }
});

// ──────────────────────────────────────────────
//  POST /api/auth/forgot-password
//  Genera token de recuperación y lo envía por email
// ──────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido." });

  // Siempre responder ok (no revelar si el email existe)
  res.json({ message: "Si el correo está registrado, recibirás un enlace de recuperación." });

  try {
    const result = await q(
      `SELECT empleado_id, nombre, email FROM Empleado WHERE email = @email AND activo = 1`,
      { email: email.trim().toLowerCase() }
    );

    const empleado = result.recordset[0];
    if (!empleado) return; // silencioso

    // Generar token seguro (64 hex chars = 32 bytes)
    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await q(
      `UPDATE Empleado
       SET recovery_token = @token, recovery_token_expires = @exp
       WHERE empleado_id = @id`,
      { token, exp: expires, id: empleado.empleado_id }
    );

    // Enviar email
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

    const mailer = getMailer();
    await mailer.sendMail({
      from:    `"Empanadas Sumercé" <${process.env.SMTP_USER}>`,
      to:      empleado.email,
      subject: "Recuperación de contraseña — Empanadas Sumercé",
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #eee;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:48px;">🥟</span>
            <h2 style="color:#023C81;font-family:'Syne',sans-serif;margin:8px 0 0;">Empanadas Sumercé</h2>
          </div>
          <p>Hola <strong>${empleado.nombre}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}"
               style="background:linear-gradient(135deg,#023C81,#1254A8);color:#fff;padding:14px 28px;
                      border-radius:10px;text-decoration:none;font-weight:700;font-family:'Syne',sans-serif;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color:#4A5B72;font-size:13px;">
            Este enlace expira en <strong>1 hora</strong>. Si no solicitaste esto, ignora este mensaje.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:11px;text-align:center;">
            Empanadas Sumercé — Panel Administrativo 🇨🇴
          </p>
        </div>
      `,
    });

    await q(
      `INSERT INTO LogSistema (nivel, modulo, accion, empleado_id)
       VALUES ('INFO','auth','recovery_token_enviado',@id)`,
      { id: empleado.empleado_id }
    ).catch(() => {});
  } catch (err) {
    console.error("Error forgot-password:", err.message);
  }
});

// ──────────────────────────────────────────────
//  POST /api/auth/reset-password
//  Valida el token y cambia la contraseña
// ──────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token y nueva contraseña requeridos." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
  }

  try {
    // Buscar token válido y no expirado
    const result = await q(
      `SELECT empleado_id, nombre FROM Empleado
       WHERE recovery_token = @token
         AND recovery_token_expires > GETDATE()
         AND activo = 1`,
      { token }
    );

    const empleado = result.recordset[0];
    if (!empleado) {
      return res.status(400).json({ error: "El enlace de recuperación es inválido o ha expirado." });
    }

    // Hashear nueva contraseña
    const hash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña y limpiar token
    await q(
      `UPDATE Empleado
       SET password_hash = @hash,
           recovery_token = NULL,
           recovery_token_expires = NULL
       WHERE empleado_id = @id`,
      { hash, id: empleado.empleado_id }
    );

    await q(
      `INSERT INTO LogSistema (nivel, modulo, accion, empleado_id)
       VALUES ('INFO','auth','password_restablecida',@id)`,
      { id: empleado.empleado_id }
    ).catch(() => {});

    res.json({ message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión." });
  } catch (err) {
    console.error("Error reset-password:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ──────────────────────────────────────────────
//  POST /api/auth/change-password  (autenticado)
//  El empleado logueado cambia su propia contraseña
// ──────────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  // El middleware requireAuth pone req.user
  const { currentPassword, newPassword } = req.body;
  const empleadoId = req.user?.empleadoId;

  if (!empleadoId) return res.status(401).json({ error: "No autenticado." });
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Campos requeridos." });
  if (newPassword.length < 8) return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });

  try {
    const result = await q(
      `SELECT password_hash FROM Empleado WHERE empleado_id = @id AND activo = 1`,
      { id: empleadoId }
    );
    const emp = result.recordset[0];
    if (!emp) return res.status(404).json({ error: "Empleado no encontrado." });

    const valid = await bcrypt.compare(currentPassword, emp.password_hash);
    if (!valid) return res.status(401).json({ error: "La contraseña actual es incorrecta." });

    const hash = await bcrypt.hash(newPassword, 12);
    await q(
      `UPDATE Empleado SET password_hash = @hash WHERE empleado_id = @id`,
      { hash, id: empleadoId }
    );

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/auth/me  (autenticado)
//  Devuelve los datos del usuario actual
// ──────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const empleadoId = req.user?.empleadoId;
  if (!empleadoId) return res.status(401).json({ error: "No autenticado." });

  try {
    const result = await q(
      `SELECT e.empleado_id, e.nombre, e.apellidos, e.email, e.username,
              e.telefono_whatsapp, e.ultima_sesion,
              r.rol_id, r.nombre AS rol
       FROM Empleado e JOIN Rol r ON e.rol_id = r.rol_id
       WHERE e.empleado_id = @id AND e.activo = 1`,
      { id: empleadoId }
    );
    const emp = result.recordset[0];
    if (!emp) return res.status(404).json({ error: "Empleado no encontrado." });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/auth/seed-passwords  (solo en dev)
//  Genera y asigna contraseñas iniciales a los empleados
//  que tienen el placeholder como hash
// ──────────────────────────────────────────────
router.post("/seed-passwords", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "No disponible en producción." });
  }

  const defaultPassword = req.body.password || "Sumerce2024!";

  try {
    const hash = await bcrypt.hash(defaultPassword, 12);

    // Solo actualiza los que tienen el placeholder
    const result = await q(
      `UPDATE Empleado
       SET password_hash = @hash
       WHERE password_hash LIKE '$2b$12$PLACEHOLDER%'
          OR password_hash IS NULL
          OR password_hash = ''`,
      { hash }
    );

    res.json({
      message: `Contraseñas inicializadas. Password: "${defaultPassword}"`,
      rowsAffected: result.rowsAffected[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;