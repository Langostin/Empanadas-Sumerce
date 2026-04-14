// src/views/Repartidor/HistorialView.jsx
import { useState } from "react";
import {
  Box, Typography, Paper, Skeleton, Chip, Alert,
  InputAdornment, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, alpha,
} from "@mui/material";
import HistoryIcon      from "@mui/icons-material/History";
import CheckCircleIcon  from "@mui/icons-material/CheckCircleRounded";
import AccessTimeIcon   from "@mui/icons-material/AccessTimeRounded";
import AttachMoneyIcon  from "@mui/icons-material/AttachMoneyRounded";
import SearchIcon       from "@mui/icons-material/SearchRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import { useHistorialRepartidor } from "../../controllers/useRepartidor";

function MetricaCard({ label, value, color, icon, loading }) {
  return (
    <Box sx={{ p: 2, borderRadius: 3, flex: 1, textAlign: "center", background: alpha(color, 0.07), border: `1.5px solid ${alpha(color, 0.18)}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.4 }}>
      <Box sx={{ color, "& svg": { fontSize: 22 } }}>{icon}</Box>
      {loading ? <Skeleton width={60} height={28} /> : (
        <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color, lineHeight: 1 }}>{value}</Typography>
      )}
      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11 }}>{label}</Typography>
    </Box>
  );
}

const estadoColor = {
  entregado:  { bg: alpha("#18A558", 0.1), color: "#18A558" },
  completado: { bg: alpha("#18A558", 0.1), color: "#18A558" },
};

export default function HistorialView() {
  const [fecha, setFecha] = useState("");
  const params = fecha ? { fecha } : {};
  const { historial, loading } = useHistorialRepartidor(params);
  const { data = [], metricas = {} } = historial;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: "linear-gradient(135deg, #7B1FA2, #4A148C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(123,31,162,0.3)",
          }}
        >
          <HistoryIcon sx={{ color: "#fff", fontSize: 24 }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color: "#0D1B2E", lineHeight: 1.2 }}>
            Historial de Entregas
          </Typography>
          <Typography variant="caption" sx={{ color: "#4A5B72" }}>
            Registro de pedidos entregados
          </Typography>
        </Box>
      </Box>

      {/* Métricas del día */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <MetricaCard
          label="Entregados hoy"
          value={metricas.total_entregados ?? 0}
          color="#18A558" icon={<CheckCircleIcon />} loading={loading}
        />
        <MetricaCard
          label="Monto hoy"
          value={`$${Number(metricas.monto_total ?? 0).toFixed(0)}`}
          color="#023C81" icon={<AttachMoneyIcon />} loading={loading}
        />
        <MetricaCard
          label="Prom. entrega"
          value={`${Math.round(metricas.minutos_promedio ?? 0)} min`}
          color="#7B1FA2" icon={<AccessTimeIcon />} loading={loading}
        />
      </Box>

      {/* Filtro de fecha */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CalendarMonthIcon sx={{ color: "#4A5B72", fontSize: 18 }} />
        <TextField
          type="date" size="small" value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          label="Filtrar por fecha"
          InputLabelProps={{ shrink: true }}
          sx={{ width: 200, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        {fecha && (
          <Chip
            label="Limpiar"
            size="small"
            onClick={() => setFecha("")}
            sx={{ cursor: "pointer", fontFamily: "sans-serif" }}
          />
        )}
      </Box>

      {/* Tabla */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 4, border: "1.5px solid rgba(2,60,129,0.1)", overflow: "hidden", boxShadow: "0 2px 20px rgba(2,60,129,0.06)" }}
      >
        <Box sx={{ px: 3, py: 2, background: "linear-gradient(135deg, #7B1FA2, #4A148C)" }}>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>
            Pedidos entregados {fecha ? `— ${new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}` : ""}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ p: 2 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <HistoryIcon sx={{ fontSize: 52, color: alpha("#7B1FA2", 0.18), mb: 1 }} />
            <Typography sx={{ color: "#4A5B72", fontFamily: "sans-serif", fontSize: 14 }}>
              {fecha ? "Sin entregas en esta fecha" : "Sin entregas registradas"}
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontFamily: "sans-serif", fontWeight: 700, color: "#4A5B72", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, py: 1.2 } }}>
                <TableCell>Folio</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Tiempo</TableCell>
                <TableCell align="center">Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((p) => {
                const ec = estadoColor[p.estado_pedido] || { bg: alpha("#4A5B72", 0.1), color: "#4A5B72" };
                return (
                  <TableRow key={p.pedido_id} sx={{ "&:hover": { background: alpha("#7B1FA2", 0.03) } }}>
                    <TableCell>
                      <Chip label={p.folio} size="small"
                        sx={{ background: ec.bg, color: ec.color, fontWeight: 700, fontSize: 11, fontFamily: "sans-serif" }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: "sans-serif", fontWeight: 600, fontSize: 13, color: "#0D1B2E", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.cliente}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.direccion_texto}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558", fontSize: 14 }}>
                        ${Number(p.total).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {p.minutos_entrega != null ? (
                        <Chip
                          label={`${p.minutos_entrega} min`}
                          size="small"
                          icon={<AccessTimeIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{ background: alpha("#7B1FA2", 0.08), color: "#7B1FA2", fontWeight: 600, fontSize: 11 }}
                        />
                      ) : "—"}
                    </TableCell>
                    <TableCell align="center" sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72", whiteSpace: "nowrap" }}>
                      {p.fecha_entrega_real
                        ? new Date(p.fecha_entrega_real).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}