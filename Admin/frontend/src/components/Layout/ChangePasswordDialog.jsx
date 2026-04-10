// src/components/Layout/ChangePasswordDialog.jsx
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, InputAdornment, IconButton,
  Alert, Collapse, CircularProgress,
} from "@mui/material";
import LockIcon          from "@mui/icons-material/LockRounded";
import VisibilityIcon    from "@mui/icons-material/VisibilityRounded";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffRounded";
import authService from "../../services/authService";

export default function ChangePasswordDialog({ open, onClose }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const reset = () => {
    setCurrent(""); setNext(""); setConfirm("");
    setError(""); setSuccess(false); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!current || !next || !confirm) { setError("Completa todos los campos."); return; }
    if (next.length < 8)               { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (next !== confirm)              { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    setError("");
    try {
      await authService.changePassword(current, next);
      setSuccess(true);
      setTimeout(handleClose, 1800);
    } catch (err) {
      setError(err.response?.data?.error || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = (label, value, setter) => ({
    fullWidth: true,
    size: "small",
    label,
    type: showPass ? "text" : "password",
    value,
    onChange: e => setter(e.target.value),
    InputProps: {
      startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: "#4A5B72", fontSize: 18 }} /></InputAdornment>,
      sx: { borderRadius: 2 },
    },
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
        🔒 Cambiar contraseña
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <Collapse in={!!error}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        </Collapse>
        <Collapse in={success}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>¡Contraseña actualizada correctamente!</Alert>
        </Collapse>

        <TextField {...fieldProps("Contraseña actual", current, setCurrent)} />
        <TextField {...fieldProps("Nueva contraseña",  next,    setNext)} />
        <TextField {...fieldProps("Confirmar contraseña", confirm, setConfirm)} />

        <Button
          size="small" variant="text"
          onClick={() => setShowPass(s => !s)}
          startIcon={showPass ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
          sx={{ alignSelf: "flex-start", color: "#4A5B72", fontWeight: 600, fontSize: 12 }}
        >
          {showPass ? "Ocultar" : "Mostrar"} contraseñas
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success}
          sx={{ borderRadius: 2, fontFamily: "'Syne',sans-serif", fontWeight: 700,
                background: "linear-gradient(135deg,#023C81,#1254A8)" }}
        >
          {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}