import {
  Box, Typography, Paper, TextField, Button, Divider,
  alpha, MenuItem, Alert, Collapse, InputAdornment, Chip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import InventoryIcon from "@mui/icons-material/Inventory2Rounded";
import WarningIcon from "@mui/icons-material/WarningAmberRounded";
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyRounded";
import { useEffect, useState } from "react";
import { cocinaService } from "../../services/cocinaService";
import { api } from "../../services/authService";

const TIPOS_MERMA = [
  "Preparación incorrecta",
  "Producto dañado",
  "Caducado",
  "Devolución cliente",
  "Error de inventario",
  "Otro",
];

export default function MermasView() {
  const [insumos, setInsumos] = useState([]);
  const [mermas, setMermas] = useState([]);

  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState("");

  const [metricas, setMetricas] = useState({
    total_mermas: 0,
    unidades: 0,
    perdida: 0,
  });

  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  useEffect(() => {
    cargarInsumos();
    cargarMetricas();
    cargarMermas();
  }, []);

  const cargarInsumos = async () => {
    try {
      const res = await api.get("/cocina/insumos");
      setInsumos(res.data);
    } catch (err) {
      setError("Error cargando insumos");
    }
  };

  const cargarMetricas = async () => {
    try {
      const data = await cocinaService.getMetricasMermasHoy();

      setMetricas({
        total_mermas: Number(data.total_mermas) || 0,
        unidades: Number(data.unidades) || 0,
        perdida: Number(data.perdida) || 0,
      });

    } catch (err) {
      console.error(err);
    }
  };

  const cargarMermas = async () => {
    try {
      const data = await cocinaService.getMermas();
      setMermas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const registrar = async () => {
    try {
      if (!producto || !cantidad || !tipo) {
        setError("Completa todos los campos.");
        return;
      }

      const [tipoSel, idSel] = producto.split("-");

      await cocinaService.registrarMerma({
        insumo_id: tipoSel === "insumo" ? Number(idSel) : null,
        producto_id: tipoSel === "producto" ? Number(idSel) : null,
        cantidad: Number(cantidad),
        tipo_merma: tipo,
      });

      setExito(true);
      setError("");
      setProducto("");
      setCantidad("");
      setTipo("");

      cargarMetricas();
      cargarMermas();

    } catch (err) {
      console.error("ERROR COMPLETO 👉", err);
      console.error("RESPUESTA 👉", err.response?.data);
      setError(err.response?.data?.error || "Error al registrar merma");
    }
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
          }}
        >
          <DeleteIcon sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 20 }}>
            Mermas
          </Typography>
          <Typography variant="caption">
            Control de pérdidas
          </Typography>
        </Box>
      </Box>

      {/* STATS */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {[
          { label: "Hoy", value: metricas.total_mermas, color: "#E53935", icon: <WarningIcon /> },
          { label: "Unidades", value: metricas.unidades, color: "#023C81", icon: <InventoryIcon /> },
          { label: "Pérdida", value: `$${metricas.perdida}`, color: "#18A558", icon: <AttachMoneyIcon /> },
        ].map((m) => (
          <Box key={m.label} sx={{
            flex: 1, p: 1.8, borderRadius: 3, textAlign: "center",
            background: alpha(m.color, 0.07),
            border: `1.5px solid ${alpha(m.color, 0.18)}`,
          }}>
            {m.icon}
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: m.color }}>
              {m.value}
            </Typography>
            <Typography variant="caption">{m.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* FORM */}
      <Paper sx={{ p: 3, borderRadius: 4 }}>

        <TextField
          fullWidth
          select
          label="Insumo / Producto"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          sx={{ mb: 2 }}
        >
          {insumos.map((i) => (
            <MenuItem key={`${i.tipo}-${i.id}`} value={`${i.tipo}-${i.id}`}>
              {i.nombre} ({i.tipo})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Cantidad"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">#</InputAdornment>,
          }}
        />

        <TextField
          fullWidth
          select
          label="Tipo de merma"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          sx={{ mb: 2 }}
        >
          {TIPOS_MERMA.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>

        <Divider sx={{ mb: 2 }} />

        <Button fullWidth variant="contained" onClick={registrar}>
          Registrar merma
        </Button>
      </Paper>

      {/* HISTORIAL */}
      <Paper sx={{ p: 2.5, borderRadius: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
          Historial de mermas
        </Typography>

        {mermas.length === 0 ? (
          <Typography variant="body2">Sin registros</Typography>
        ) : (
          mermas.map((m) => (
            <Box
              key={m.merma_id}
              sx={{
                p: 1.5,
                mb: 1,
                borderRadius: 2,
                border: "1px solid #eee",
              }}
            >
              {/* 🔥 NOMBRE + TIPO */}
              <Typography sx={{ fontWeight: 600 }}>
                {m.nombre}
              </Typography>

              <Chip
                label={m.tipo}
                size="small"
                sx={{
                  mt: 0.5,
                  mb: 0.5,
                  background: m.tipo === "producto" ? "#E3F2FD" : "#FFF3E0",
                }}
              />

              <Typography variant="body2">
                {m.cantidad} unidades • {m.tipo_merma}
              </Typography>

              <Typography variant="caption">
                ${m.costo_total} pérdida
              </Typography>
            </Box>
          ))
        )}
      </Paper>

      {/* ALERTAS */}
      <Collapse in={!!error}>
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Collapse>

      <Collapse in={exito}>
        <Alert severity="success" onClose={() => setExito(false)}>
          Merma registrada correctamente
        </Alert>
      </Collapse>
    </Box>
  );
}