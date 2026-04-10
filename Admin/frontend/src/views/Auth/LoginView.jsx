// src/views/Auth/LoginView.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress,
  Divider, alpha, Collapse,
} from "@mui/material";
import VisibilityIcon     from "@mui/icons-material/VisibilityRounded";
import VisibilityOffIcon  from "@mui/icons-material/VisibilityOffRounded";
import LockIcon           from "@mui/icons-material/LockRounded";
import PersonIcon         from "@mui/icons-material/PersonRounded";
import EmailIcon          from "@mui/icons-material/EmailRounded";
import ArrowBackIcon      from "@mui/icons-material/ArrowBackRounded";
import { useAuth, ROL_DEFAULT_ROUTE } from "../../context/AuthContext";
import authService from "../../services/authService";

// ── Panel izquierdo (branding) ────────────────────────────────
function BrandPanel() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: 5,
        background: "linear-gradient(160deg, #023C81 0%, #012459 60%, #010F24 100%)",
        position: "relative",
        overflow: "hidden",
        minWidth: 380,
      }}
    >
      {/* Círculos decorativos */}
      {[
        { size: 300, top: -80,  right: -80,  opacity: 0.06 },
        { size: 200, bottom: 60, left: -60,  opacity: 0.08 },
        { size: 120, top: "40%", right: 40,  opacity: 0.10 },
      ].map((c, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            width: c.size, height: c.size, borderRadius: "50%",
            border: "1px solid rgba(254,216,23,0.3)",
            top: c.top, bottom: c.bottom,
            left: c.left, right: c.right,
            opacity: c.opacity,
          }}
        />
      ))}

      {/* Logo */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 6 }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: 3,
              background: "linear-gradient(135deg, #FED817, #C9AC0E)",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28,
            }}
          >
            🥟
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#FED817", lineHeight: 1 }}
            >
              Sumercé
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              Panel Administrativo
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h3"
          sx={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800,
            color: "#fff", lineHeight: 1.15, mb: 2,
          }}
        >
          Gestiona tu negocio desde aquí 🇨🇴
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
          Monitorea pedidos, administra clientes y empleados, todo en un solo lugar.
        </Typography>
      </Box>

      {/* Stats decorativos */}
      <Box sx={{ display: "flex", gap: 3 }}>
        {[
          { label: "Clientes activos", emoji: "👥" },
          { label: "Pedidos hoy",      emoji: "🥟" },
          { label: "Empleados",        emoji: "👔" },
        ].map(s => (
          <Box
            key={s.label}
            sx={{
              flex: 1, p: 1.5, borderRadius: 2.5,
              background: "rgba(254,216,23,0.08)",
              border: "1px solid rgba(254,216,23,0.15)",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 22 }}>{s.emoji}</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 10, display: "block" }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Formulario de Login ───────────────────────────────────────
function LoginForm({ onForgot }) {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError("Completa todos los campos."); return; }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      // Redirigir según rol o ruta intentada
      const dest = from || ROL_DEFAULT_ROUTE[user.rol] || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
      noValidate
    >
      <Box>
        <Typography variant="h4" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81", lineHeight: 1 }}>
          Bienvenido 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ingresa con tu usuario o correo electrónico
        </Typography>
      </Box>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>
      </Collapse>

      <TextField
        fullWidth
        label="Usuario o correo"
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoComplete="username"
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonIcon sx={{ color: "#4A5B72", fontSize: 20 }} />
            </InputAdornment>
          ),
          sx: { borderRadius: 2.5 },
        }}
      />

      <TextField
        fullWidth
        label="Contraseña"
        type={showPass ? "text" : "password"}
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="current-password"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon sx={{ color: "#4A5B72", fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShowPass(s => !s)} edge="end">
                {showPass
                  ? <VisibilityOffIcon sx={{ fontSize: 18 }} />
                  : <VisibilityIcon   sx={{ fontSize: 18 }} />}
              </IconButton>
            </InputAdornment>
          ),
          sx: { borderRadius: 2.5 },
        }}
      />

      <Box sx={{ textAlign: "right", mt: -1 }}>
        <Button
          variant="text" size="small"
          onClick={onForgot}
          sx={{ color: "#023C81", fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 12, p: 0.5 }}
        >
          ¿Olvidaste tu contraseña?
        </Button>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{
          borderRadius: 2.5, py: 1.4,
          fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15,
          background: "linear-gradient(135deg, #023C81, #1254A8)",
          "&:hover": { background: "linear-gradient(135deg, #012760, #023C81)" },
        }}
      >
        {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Iniciar sesión"}
      </Button>
    </Box>
  );
}

// ── Formulario de recuperación de contraseña ─────────────────
function ForgotForm({ onBack }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Ingresa tu correo electrónico."); return; }
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError("Error al enviar el correo. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "center" }}>
        <Box sx={{ fontSize: 56 }}>📬</Box>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
            ¡Correo enviado!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Si <strong>{email}</strong> está registrado, recibirás un enlace de recuperación en los próximos minutos.
          </Typography>
        </Box>
        <Button onClick={onBack} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2.5, fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
          Volver al login
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }} noValidate>
      <Button
        onClick={onBack}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start", p: 0.5, color: "#4A5B72", fontWeight: 600, fontFamily: "'Syne',sans-serif" }}
      >
        Volver
      </Button>

      <Box>
        <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
          Recuperar contraseña
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </Typography>
      </Box>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>
      </Collapse>

      <TextField
        fullWidth
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: "#4A5B72", fontSize: 20 }} />
            </InputAdornment>
          ),
          sx: { borderRadius: 2.5 },
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{
          borderRadius: 2.5, py: 1.4,
          fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15,
          background: "linear-gradient(135deg, #023C81, #1254A8)",
        }}
      >
        {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Enviar enlace"}
      </Button>
    </Box>
  );
}

// ── Vista principal de Login ──────────────────────────────────
export default function LoginView() {
  const [showForgot, setShowForgot] = useState(false);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #F0F4FA 0%, #E4EDF8 100%)",
        p: 2,
      }}
    >
      <Card
        sx={{
          display: "flex",
          maxWidth: 860,
          width: "100%",
          borderRadius: 5,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(2,60,129,0.18)",
          minHeight: 520,
        }}
      >
        {/* Panel izquierdo */}
        <BrandPanel />

        {/* Panel derecho — formularios */}
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            p: { xs: 3, sm: 5 },
          }}
        >
          {showForgot
            ? <ForgotForm    onBack={() => setShowForgot(false)} />
            : <LoginForm     onForgot={() => setShowForgot(true)} />}

          <Divider sx={{ mt: 4, mb: 2 }} />
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center", fontSize: 10 }}>
            🇨🇴 Empanadas Sumercé — Panel Administrativo v1.0
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}