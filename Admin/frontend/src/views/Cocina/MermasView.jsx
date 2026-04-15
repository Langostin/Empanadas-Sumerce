import {
  Box, Typography, Paper, TextField, Button, Divider,
  alpha, MenuItem, Alert, Collapse, InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import InventoryIcon from "@mui/icons-material/Inventory2Rounded";
import WarningIcon from "@mui/icons-material/WarningAmberRounded";
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyRounded";
import { useState } from "react";

const TIPOS_MERMA = [
  "Preparación incorrecta",
  "Producto dañado",
  "Caducado",
  "Devolución cliente",
  "Error de inventario",
  "Otro",
];

export default function MermasView() {
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const registrar = () => {
    if (!producto || !cantidad || !tipo) {
      setError("Completa todos los campos.");
      return;
    }

    // 🔥 aquí luego conectas backend
    console.log({ producto, cantidad, tipo });

    setExito(true);
    setError("");
    setProducto("");
    setCantidad("");
    setTipo("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, maxWidth: 500, mx: "auto" }}>

      {/* HEADER */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: "linear-gradient(135deg, #E53935, #B71C1C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(229,57,53,0.3)",
          }}
        >
          <DeleteIcon sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color: "#0D1B2E" }}>
            Mermas
          </Typography>
          <Typography variant="caption" sx={{ color: "#4A5B72" }}>
            Control de pérdidas
          </Typography>
        </Box>
      </Box>

      {/* STATS RÁPIDAS (fake por ahora) */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {[
          { label: "Hoy", value: 5, color: "#E53935", icon: <WarningIcon /> },
          { label: "Unidades", value: 18, color: "#023C81", icon: <InventoryIcon /> },
          { label: "Pérdida", value: "$320", color: "#18A558", icon: <AttachMoneyIcon /> },
        ].map((m) => (
          <Box
            key={m.label}
            sx={{
              flex: 1, p: 1.8, borderRadius: 3, textAlign: "center",
              background: alpha(m.color, 0.07),
              border: `1.5px solid ${alpha(m.color, 0.18)}`,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 0.5 }}>
              {m.icon}
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: m.color }}>
              {m.value}
            </Typography>
            <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11 }}>
              {m.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* FORMULARIO */}
      <Paper
        elevation={0}
        sx={{
          p: 3, borderRadius: 4,
          border: "1.5px solid rgba(229,57,53,0.15)",
          background: "#fff",
          boxShadow: "0 2px 20px rgba(229,57,53,0.06)",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#4A5B72", mb: 2 }}>
          Registrar merma
        </Typography>

        {/* Producto */}
        <TextField
          fullWidth
          label="Producto"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Cantidad */}
        <TextField
          fullWidth
          label="Cantidad"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">#</InputAdornment>
            ),
          }}
        />

        {/* Tipo */}
        <TextField
          fullWidth
          select
          label="Tipo de merma"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          sx={{ mb: 2 }}
        >
          {TIPOS_MERMA.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>

        <Divider sx={{ mb: 2 }} />

        <Button
          fullWidth
          variant="contained"
          onClick={registrar}
          sx={{
            background: "linear-gradient(135deg, #E53935, #B71C1C)",
            color: "#fff",
            fontWeight: 700,
            borderRadius: 3,
            py: 1.5,
            boxShadow: "0 4px 16px rgba(229,57,53,0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #B71C1C, #7F0000)",
            },
          }}
        >
          Registrar merma
        </Button>
      </Paper>

      {/* ERROR */}
      <Collapse in={!!error}>
        <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      </Collapse>

      {/* EXITO */}
      <Collapse in={exito}>
        <Alert severity="success" onClose={() => setExito(false)} sx={{ borderRadius: 2.5 }}>
          Merma registrada correctamente
        </Alert>
      </Collapse>
    </Box>
  );
}