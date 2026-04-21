import {
  Box, Typography, Paper, TextField, Button,
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
  const [cortes, setCortes] = useState([]);

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

  const [loadingCorte, setLoadingCorte] = useState(false);

  // 🔥 detalle de corte
  const [corteSeleccionado, setCorteSeleccionado] = useState(null);
  const [detalleCorte, setDetalleCorte] = useState([]);

  useEffect(() => {
    cargarInsumos();
    cargarMetricas();
    cargarMermas();
    cargarCortes();
  }, []);

  // ==========================
  // LOADERS
  // ==========================
  const cargarInsumos = async () => {
    try {
      const res = await api.get("/cocina/insumos");
      setInsumos(res.data);
    } catch {
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

  const cargarCortes = async () => {
    try {
      const r = await api.get("/cocina/mermas/cortes");
      setCortes(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  // MERMA
  // ==========================
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
      setError(err.response?.data?.error || "Error al registrar merma");
    }
  };

  // ==========================
  // CORTE
  // ==========================
  const hacerCorte = async () => {
    try {
      setLoadingCorte(true);

      await cocinaService.hacerCorteMermas();

      setExito(true);
      setError("");

      cargarMetricas();
      cargarMermas();
      cargarCortes();

    } catch (err) {
      setError(err.response?.data?.error || "Error al hacer corte");
    } finally {
      setLoadingCorte(false);
    }
  };

  // ==========================
  // VER DETALLE CORTE
  // ==========================
 const verDetalleCorte = async (id) => {
  try {
    const r = await api.get(`/cocina/mermas/cortes/${id}/full`);
    setDetalleCorte(r.data.detalle);
    setCorteSeleccionado(id);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <Box sx={{ width: "100%", px: 2, pb: 4 }}>

      {/* HEADER */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Box sx={{
          width: 50, height: 50, borderRadius: 3,
          background: "linear-gradient(135deg, #E53935, #B71C1C)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
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
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 2,
        mb: 3
      }}>
        {[
          { label: "Activas", value: metricas.total_mermas, color: "#E53935", icon: <WarningIcon /> },
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

      {/* MAIN */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3
      }}>

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

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Cantidad"
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">#</InputAdornment>,
                }}
              />

              <TextField
                select
                label="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS_MERMA.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Button variant="contained" onClick={registrar}>
              Registrar merma
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={hacerCorte}
              disabled={loadingCorte}
            >
              {loadingCorte ? "Cerrando corte..." : "🔥 Cerrar corte de mermas"}
            </Button>

          </Box>
        </Paper>

        {/* MERMAS ACTIVAS */}
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>
            Mermas activas
          </Typography>

          {mermas.length === 0 ? (
            <Typography>No hay mermas activas</Typography>
          ) : (
            mermas.map((m) => (
              <Box key={m.merma_id} sx={{
                p: 2,
                border: "1px solid #eee",
                borderRadius: 3,
                mb: 1
              }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {m.nombre}
                </Typography>

                <Typography variant="body2">
                  {m.cantidad} unidades • {m.tipo_merma}
                </Typography>

                <Typography variant="caption" color="error">
                  ${m.costo_total} pérdida
                </Typography>
              </Box>
            ))
          )}
        </Paper>

      </Box>

      {/* HISTORIAL DE CORTES */}
      <Paper sx={{ p: 3, borderRadius: 4, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>
          Historial de cortes
        </Typography>

        {cortes.map((c) => (
          <Box key={c.corte_id} sx={{
            p: 2,
            border: "1px solid #eee",
            borderRadius: 3,
            mb: 1
          }}>
            <Typography sx={{ fontWeight: 700 }}>
              Corte #{c.corte_id}
            </Typography>

            <Typography variant="body2">
              {c.total_unidades} unidades • ${c.total_costo}
            </Typography>

            <Typography variant="caption" display="block">
              {new Date(c.fecha).toLocaleString()}
            </Typography>

            <Button size="small" onClick={() => verDetalleCorte(c.corte_id)}>
              Ver detalle
            </Button>
          </Box>
        ))}
      </Paper>

      {/* DETALLE DEL CORTE */}
      {corteSeleccionado && (
        <Paper sx={{ p: 3, borderRadius: 4, mt: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>
            Detalle del corte #{corteSeleccionado}
          </Typography>

          {detalleCorte.map((d, i) => (
            <Box key={i} sx={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #eee",
              py: 1
            }}>
              <Typography>{d.nombre}</Typography>
              <Typography>{d.cantidad} • ${d.costo_total}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* ALERTAS */}
      <Collapse in={!!error}>
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Collapse>

      <Collapse in={exito}>
        <Alert severity="success" onClose={() => setExito(false)}>
          Operación exitosa
        </Alert>
      </Collapse>

    </Box>
  );
}