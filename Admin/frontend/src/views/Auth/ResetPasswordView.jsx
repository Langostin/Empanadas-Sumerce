// src/views/Auth/ResetPasswordView.jsx
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Collapse,
} from "@mui/material";
import LockIcon          from "@mui/icons-material/LockRounded";
import VisibilityIcon    from "@mui/icons-material/VisibilityRounded";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffRounded";
import CheckCircleIcon   from "@mui/icons-material/CheckCircleRounded";
import authService from "../../services/authService";

export default function ResetPasswordView() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token") || "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  if (!token) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Enlace de recuperación inválido. Solicita uno nuevo desde la pantalla de login.
        </Alert>
      </Box>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "El enlace expiró o es inválido. Solicita uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #F0F4FA 0%, #E4EDF8 100%)",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: "100%", borderRadius: 5, boxShadow: "0 16px 48px rgba(2,60,129,0.14)" }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>

          {/* Logo */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ fontSize: 48, mb: 1 }}>🥟</Box>
            <Typography variant="h6" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
              Empanadas Sumercé
            </Typography>
          </Box>

          {success ? (
            <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: "#18A558" }} />
              <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
                ¡Contraseña actualizada!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tu contraseña ha sido restablecida correctamente.
              </Typography>
              <Button
                variant="contained" fullWidth size="large"
                onClick={() => navigate("/login", { replace: true })}
                sx={{
                  mt: 1, borderRadius: 2.5, fontFamily: "'Syne',sans-serif", fontWeight: 700,
                  background: "linear-gradient(135deg, #023C81, #1254A8)",
                }}
              >
                Iniciar sesión
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }} noValidate>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
                  Nueva contraseña
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Elige una contraseña segura de al menos 8 caracteres.
                </Typography>
              </Box>

              <Collapse in={!!error}>
                <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>
              </Collapse>

              {[
                { label: "Nueva contraseña",         value: password, setter: setPassword },
                { label: "Confirmar nueva contraseña", value: confirm, setter: setConfirm },
              ].map(f => (
                <TextField
                  key={f.label}
                  fullWidth label={f.label}
                  type={showPass ? "text" : "password"}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: "#4A5B72", fontSize: 20 }} /></InputAdornment>,
                    endAdornment: f.label.includes("Nueva") && !f.label.includes("Conf") ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPass(s => !s)} edge="end">
                          {showPass ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: { borderRadius: 2.5 },
                  }}
                />
              ))}

              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading}
                sx={{
                  borderRadius: 2.5, py: 1.4,
                  fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15,
                  background: "linear-gradient(135deg, #023C81, #1254A8)",
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Restablecer contraseña"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}