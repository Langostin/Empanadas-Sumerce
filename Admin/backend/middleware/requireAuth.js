// backend/middleware/requireAuth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cambia_esto_en_produccion_s3cr3t0";

/**
 * Middleware que verifica el JWT en el header Authorization.
 * Adjunta req.user con el payload decodificado.
 *
 * Para rutas que requieren roles específicos usa requireRole:
 *   router.get("/admin-only", requireAuth, requireRole("administrador"), handler)
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acceso requerido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sesión expirada. Inicia sesión nuevamente.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Token inválido.", code: "TOKEN_INVALID" });
  }
}

/**
 * Factory que crea middleware para roles específicos.
 * Uso: requireRole("administrador") o requireRole(["administrador","cocina"])
 */
function requireRole(...roles) {
  const allowed = roles.flat().map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado." });
    if (!allowed.includes(req.user.rol?.toLowerCase())) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${allowed.join(" o ")}.`,
        code: "FORBIDDEN",
      });
    }
    
    next();
  };
}

module.exports = { requireAuth, requireRole };