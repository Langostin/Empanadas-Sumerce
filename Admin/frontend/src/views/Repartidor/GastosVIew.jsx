// src/views/Repartidor/GastosVIew.jsx
import { useState } from "react";
import {
  Box, Typography, TextField, Button, MenuItem, Alert, Collapse,
  Paper, Divider, CircularProgress, alpha, Skeleton, Chip,
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import AddIcon from "@mui/icons-material/AddRounded";
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import { useGastosRepartidor } from "../../controllers/useRepartidor";
import { repartidorService } from "../../services/repartidorService";

// Mes actual en formato YYYY-MM
const mesActualDefault = () => new Date().toISOString().slice(0, 7);

function MetricaCard({ label, value, color, icon }) {
  return (
    <Box
      sx={{
        p: 2, borderRadius: 3, textAlign: "center", flex: 1,
        background: alpha(color, 0.07),
        border: `1.5px solid ${alpha(color, 0.18)}`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0.4,
      }}
    >
      <Box sx={{ color, "& svg": { fontSize: 22 } }}>{icon}</Box>
      <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11 }}>{label}</Typography>
    </Box>
  );
}

export default function GastosView() {
  const [mes, setMes] = useState(mesActualDefault);
  const { data, loading, reload } = useGastosRepartidor(mes);

  // Form
  const [form, setForm]       = useState({ tipo_gasto_id: "", monto: "", descripcion: "", fecha_gasto: new Date().toISOString().slice(0, 10) });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState("");
  const [exito,     setExito]     = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const guardar = async () => {
    if (!form.tipo_gasto_id || !form.monto) {
      setError("Tipo de gasto y monto son obligatorios.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const response = await repartidorService.registrarGasto(form);
      if (response.ok) {
        setExito(true);
        // Cambiar el mes seleccionado a la fecha del gasto registrado
        const gastoMes = form.fecha_gasto.slice(0, 7); // YYYY-MM
        setMes(gastoMes);
        setForm({ tipo_gasto_id: "", monto: "", descripcion: "", fecha_gasto: new Date().toISOString().slice(0, 10) });
        // Pequeño delay para asegurar que la transacción se complete
        setTimeout(() => reload(), 500);
        setTimeout(() => setExito(false), 3000);
      } else {
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  };

  const { gastos = [], tipos = [], resumen = {} } = data;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: "linear-gradient(135deg, #FF6F00, #E65100)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(255,111,0,0.3)",
          }}
        >
          <LocalGasStationIcon sx={{ color: "#fff", fontSize: 24 }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color: "#0D1B2E", lineHeight: 1.2 }}>
            Gastos de Ruta
          </Typography>
          <Typography variant="caption" sx={{ color: "#4A5B72" }}>
            Registra y consulta tus gastos operativos
          </Typography>
        </Box>
      </Box>

      {/* Métricas del mes */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {loading ? (
          <>
            <Skeleton variant="rounded" width="50%" height={90} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" width="50%" height={90} sx={{ borderRadius: 3 }} />
          </>
        ) : (
          <>
            <MetricaCard
              label="Total del mes"
              value={`$${Number(resumen.total_mes || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
              color="#FF6F00"
              icon={<AttachMoneyIcon />}
            />
            <MetricaCard
              label="Registros"
              value={resumen.total_registros || 0}
              color="#023C81"
              icon={<CalendarMonthIcon />}
            />
          </>
        )}
      </Box>

      {/* Selector de mes */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CalendarMonthIcon sx={{ color: "#4A5B72", fontSize: 18 }} />
        <TextField
          type="month"
          size="small"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          sx={{ width: 180, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </Box>

      {/* Formulario */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1.5px solid rgba(2,60,129,0.1)", background: "#fff", boxShadow: "0 2px 20px rgba(2,60,129,0.06)" }}>
        <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, color: "#4A5B72", mb: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Nuevo Gasto
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
          <TextField
            select fullWidth size="small" label="Tipo de gasto" name="tipo_gasto_id"
            value={form.tipo_gasto_id} onChange={handleChange}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
          >
            {tipos.length === 0 ? (
              <MenuItem disabled>Cargando…</MenuItem>
            ) : (
              tipos.map((t) => (
                <MenuItem key={t.tipo_gasto_id} value={t.tipo_gasto_id}>
                  {t.nombre}
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            fullWidth size="small" label="Monto" name="monto" type="number"
            value={form.monto} onChange={handleChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
          />

          <TextField
            fullWidth size="small" label="Descripción (opcional)" name="descripcion"
            value={form.descripcion} onChange={handleChange}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
          />

          <TextField
            fullWidth size="small" label="Fecha" name="fecha_gasto" type="date"
            value={form.fecha_gasto} onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
          />

          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          </Collapse>

          <Collapse in={exito}>
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              ✅ Gasto registrado exitosamente.
            </Alert>
          </Collapse>

          <Button
            fullWidth variant="contained" size="large"
            startIcon={guardando ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <AddIcon />}
            onClick={guardar} disabled={guardando}
            sx={{
              background: "linear-gradient(135deg, #FF6F00, #E65100)",
              color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 14,
              borderRadius: 3, py: 1.4,
              boxShadow: "0 4px 16px rgba(255,111,0,0.3)",
              "&:hover": { background: "linear-gradient(135deg, #E65100, #BF360C)" },
              "&.Mui-disabled": { background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.26)" },
            }}
          >
            {guardando ? "Guardando…" : "Registrar Gasto"}
          </Button>
        </Box>
      </Paper>

      {/* Tabla de gastos */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: "1.5px solid rgba(2,60,129,0.1)", overflow: "hidden", boxShadow: "0 2px 20px rgba(2,60,129,0.06)" }}>
        <Box sx={{ px: 3, py: 2, background: "linear-gradient(135deg, #023C81, #012459)" }}>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>
            Gastos del mes
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ p: 2 }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />)}
          </Box>
        ) : gastos.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <LocalGasStationIcon sx={{ fontSize: 48, color: alpha("#023C81", 0.18), mb: 1 }} />
            <Typography sx={{ color: "#4A5B72", fontFamily: "sans-serif", fontSize: 14 }}>
              Sin gastos registrados este mes
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontFamily: "sans-serif", fontWeight: 700, color: "#4A5B72", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, py: 1.2 } }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gastos.map((g) => (
                <TableRow key={g.gasto_id} sx={{ "&:hover": { background: alpha("#023C81", 0.03) } }}>
                  <TableCell sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#4A5B72" }}>
                    {new Date(g.fecha_gasto + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </TableCell>
                  <TableCell>
                    <Chip label={g.tipo_gasto} size="small"
                      sx={{ background: alpha("#FF6F00", 0.1), color: "#FF6F00", fontWeight: 600, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#0D1B2E" }}>
                    {g.descripcion || "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#E65100", fontSize: 14 }}>
                      ${Number(g.monto).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}