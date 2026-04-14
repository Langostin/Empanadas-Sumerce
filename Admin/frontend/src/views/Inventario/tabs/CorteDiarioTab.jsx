// src/views/Inventario/tabs/CorteDiarioTab.jsx
import { useState } from "react";
import {
  Box, Card, CardContent, Grid, Typography, Button, TextField,
  Alert, Collapse, Chip, Divider, Skeleton, alpha, CircularProgress,
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSaleRounded";
import RefreshIcon     from "@mui/icons-material/RefreshRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { useCorteDiario } from "../../../controllers/useInventario";

function MetricaBox({ label, value, color = "#023C81", emoji, sub }) {
  return (
    <Box
      sx={{
        p: 2, borderRadius: 3, textAlign: "center",
        background: alpha(color, 0.06),
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <Typography sx={{ fontSize: 28, lineHeight: 1, mb: 0.5 }}>{emoji}</Typography>
      <Typography variant="h5" sx={{ fontFamily: "sans-serif", fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11, display: "block", mt: 0.3 }}>{label}</Typography>
      {sub && <Typography variant="caption" sx={{ color, fontSize: 10, fontWeight: 600 }}>{sub}</Typography>}
    </Box>
  );
}

export default function CorteDiarioTab() {
  const { corte, loading, ejecutando, mensaje, setMensaje, ejecutar, reload } = useCorteDiario();
  const [obs,     setObs]     = useState("");
  const [confirm, setConfirm] = useState(false);

  const hoy = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const pesos = v => `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const yaHayCorte = !!corte?.corte_guardado;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81" }}>
            🏪 Corte diario de caja
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
            {hoy}
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={reload} size="small" variant="outlined"
          sx={{ borderRadius: 2, fontFamily: "sans-serif", fontWeight: 600 }}>
          Actualizar
        </Button>
      </Box>

      {/* Alerta de estado */}
      <Collapse in={!!mensaje}>
        <Alert severity={mensaje?.tipo} onClose={() => setMensaje(null)} sx={{ borderRadius: 2.5 }}>
          {mensaje?.texto}
        </Alert>
      </Collapse>

      {yaHayCorte && (
        <Alert severity="info" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5 }}>
          El corte de hoy ya fue realizado a las {new Date(corte.corte_guardado.fecha_registro).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}.
          Los datos a continuación son en tiempo real.
        </Alert>
      )}

      {/* Métricas en tiempo real */}
      {loading ? (
        <Grid container spacing={2}>
          {[1,2,3,4,5,6].map(i => <Grid item xs={6} md={4} key={i}><Skeleton height={100} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : !corte ? null : (
        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <MetricaBox label="Ingresos totales del día" emoji="💰"
              value={pesos(corte.total_ventas)} color="#023C81"
              sub={`${corte.total_pedidos} pedidos entregados`} />
          </Grid>
          <Grid item xs={6} md={4}>
            <MetricaBox label="Efectivo recibido" emoji="💵"
              value={pesos(corte.efectivo)} color="#18A558" />
          </Grid>
          <Grid item xs={6} md={4}>
            <MetricaBox label="Tarjeta cobrada" emoji="💳"
              value={pesos(corte.tarjeta)} color="#1254A8" />
          </Grid>
          <Grid item xs={6} md={4}>
            <MetricaBox label="Gastos del día" emoji="📤"
              value={pesos(corte.total_gastos)} color="#E53935" />
          </Grid>
          <Grid item xs={6} md={4}>
            <MetricaBox label="Reserva para impuestos (IVA)" emoji="🏛️"
              value={pesos(corte.iva_total)} color="#FF9800" />
          </Grid>
          <Grid item xs={6} md={4}>
            <MetricaBox
              label="Utilidad bruta del día" emoji="📈"
              value={pesos(corte.utilidad_bruta)}
              color={corte.utilidad_bruta >= 0 ? "#18A558" : "#E53935"}
              sub={corte.utilidad_bruta >= 0 ? "✅ Positiva" : "❌ Negativa"}
            />
          </Grid>
        </Grid>
      )}

      <Divider />

      {/* Resumen visual */}
      {!loading && corte && (
        <Card sx={{ background: "linear-gradient(135deg, #023C81 0%, #012459 100%)", color: "#fff" }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2, opacity: 0.85 }}>
              📊 Resumen del día
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {[
                { label: "Total ventas",            value: pesos(corte.total_ventas),   color: "#FED817" },
                { label: "(-) Total gastos",        value: pesos(corte.total_gastos),   color: "#ff6b6b" },
                { label: "(-) Reserva IVA",         value: pesos(corte.iva_total),      color: "#ffa94d" },
                { label: "= Utilidad neta estimada",value: pesos(corte.utilidad_bruta - corte.iva_total), color: corte.utilidad_bruta - corte.iva_total >= 0 ? "#69db7c" : "#ff6b6b" },
              ].map(r => (
                <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                          py: 0.8, borderBottom: "1px solid rgba(255,255,255,0.07)", "&:last-child": { borderBottom: "none" } }}>
                  <Typography variant="body2" sx={{ opacity: 0.75, fontSize: 13 }}>{r.label}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: r.color, fontSize: 15 }}>
                    {r.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Ejecutar corte */}
      <Card sx={{ border: "2px dashed rgba(2,60,129,0.2)" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 800, mb: 0.5 }}>
            ✅ Registrar corte de caja
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Guarda el resumen financiero del día en el histórico. Puede ejecutarse varias veces; siempre actualiza el registro de hoy.
          </Typography>
          <TextField fullWidth size="small" multiline rows={2}
            label="Observaciones (opcional)"
            value={obs} onChange={e => setObs(e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }} sx={{ mb: 2 }} />

          {!confirm ? (
            <Button variant="contained" startIcon={<PointOfSaleIcon />}
              onClick={() => setConfirm(true)} fullWidth
              sx={{
                borderRadius: 2.5, py: 1.4,
                fontFamily: "sans-serif", fontWeight: 700, fontSize: 15,
                background: "linear-gradient(135deg,#023C81,#1254A8)",
              }}>
              Ejecutar corte diario
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => setConfirm(false)}
                sx={{ borderRadius: 2.5, fontFamily: "sans-serif", fontWeight: 600 }}>
                Cancelar
              </Button>
              <Button variant="contained" color="success" fullWidth disabled={ejecutando}
                onClick={() => { ejecutar(obs); setConfirm(false); setObs(""); }}
                sx={{ borderRadius: 2.5, fontFamily: "sans-serif", fontWeight: 700 }}>
                {ejecutando ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "✅ Confirmar corte"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}