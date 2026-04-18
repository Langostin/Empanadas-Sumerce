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
  <Box sx={{ width: "100%", px: 2, pb: 4 }}>

    {/* HEADER */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
      <Box
        sx={{
          width: 50, height: 50, borderRadius: 3,
          background: "linear-gradient(135deg, #E53935, #B71C1C)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <DeleteIcon sx={{ color: "#fff" }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 22 }}>
          Mermas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Control de pérdidas
        </Typography>
      </Box>
    </Box>

    {/* STATS */}
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 2,
        mb: 3
      }}
    >
      {[
        { label: "Hoy", value: metricas.total_mermas, color: "#E53935", icon: <WarningIcon /> },
        { label: "Unidades", value: metricas.unidades, color: "#023C81", icon: <InventoryIcon /> },
        { label: "Pérdida", value: `$${metricas.perdida}`, color: "#18A558", icon: <AttachMoneyIcon /> },
      ].map((m) => (
        <Paper key={m.label} sx={{
          p: 2,
          borderRadius: 4,
          textAlign: "center",
          background: alpha(m.color, 0.08),
        }}>
          {m.icon}
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: m.color }}>
            {m.value}
          </Typography>
          <Typography variant="caption">{m.label}</Typography>
        </Paper>
      ))}
    </Box>

    {/* CONTENIDO PRINCIPAL */}
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3
      }}
    >

      {/* FORM */}
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>
          Registrar merma
        </Typography>

        <Box sx={{ display: "grid", gap: 2 }}>

          <TextField
            select
            label="Insumo / Producto"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            fullWidth
          >
            {insumos.map((i) => (
              <MenuItem key={`${i.tipo}-${i.id}`} value={`${i.tipo}-${i.id}`}>
                {i.nombre} ({i.tipo})
              </MenuItem>
            ))}
          </TextField>

          {/* 🔥 fila doble */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Cantidad"
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">#</InputAdornment>,
              }}
              fullWidth
            />

            <TextField
              select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              fullWidth
            >
              {TIPOS_MERMA.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={registrar}
          >
            Registrar merma
          </Button>

        </Box>
      </Paper>

      {/* HISTORIAL */}
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>
          Historial
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {mermas.length === 0 ? (
            <Typography variant="body2">Sin registros</Typography>
          ) : (
            mermas.map((m) => (
              <Box
                key={m.merma_id}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #eee",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {m.nombre}
                  </Typography>

                  <Chip
                    label={m.tipo}
                    size="small"
                    sx={{
                      background: m.tipo === "producto" ? "#E3F2FD" : "#FFF3E0",
                    }}
                  />
                </Box>

                <Typography variant="body2">
                  {m.cantidad} unidades • {m.tipo_merma}
                </Typography>

                <Typography variant="caption" color="error">
                  ${m.costo_total} pérdida
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Paper>

    </Box>

    {/* ALERTAS */}
    <Collapse in={!!error}>
      <Alert severity="error" onClose={() => setError("")} sx={{ mt: 2 }}>
        {error}
      </Alert>
    </Collapse>

    <Collapse in={exito}>
      <Alert severity="success" onClose={() => setExito(false)} sx={{ mt: 2 }}>
        Merma registrada correctamente
      </Alert>
    </Collapse>

  </Box>
);
}