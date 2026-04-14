// src/views/Cocina/CocinaView.jsx
import { useState } from "react";
import {
  Box, Grid, Typography, Chip, Alert, Skeleton, Tabs, Tab,
  alpha, Badge,
} from "@mui/material";
import WarningAmberIcon      from "@mui/icons-material/WarningAmberRounded";
import PendingIcon           from "@mui/icons-material/PendingActionsRounded";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import CheckCircleIcon       from "@mui/icons-material/CheckCircleRounded";
import AccessTimeIcon        from "@mui/icons-material/AccessTimeRounded";
import RestaurantIcon        from "@mui/icons-material/RestaurantRounded";

import { useColaCocina, useMetricasCocina } from "../../controllers/useCocina";
import ColaTab        from "./tabs/ColaTab";
import HistorialTab   from "./tabs/HistorialTab";
import InsumosTab     from "./tabs/InsumosTab";

// ── Tarjeta de métrica ─────────────────────────────────────────
function MetricaCard({ label, value, color, icon, sub, loading }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        textAlign: "center",
        background: alpha(color, 0.07),
        border: `1.5px solid ${alpha(color, 0.18)}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.4,
        minWidth: 0,
      }}
    >
      <Box sx={{ color, "& svg": { fontSize: 22 } }}>{icon}</Box>
      {loading ? (
        <Skeleton width={60} height={32} />
      ) : (
        <Typography
          sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 24, color, lineHeight: 1 }}
        >
          {value}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10, fontWeight: 500 }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color, fontSize: 10, fontWeight: 700 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function CocinaView() {
  const [tab, setTab] = useState(0);

  const { cola, loading: loadingCola, error, lastSync, reload } = useColaCocina(15000);
  const { metricas, loading: loadingMetricas } = useMetricasCocina();

  const pendientes  = cola.resumen?.pendientes  ?? 0;
  const enProceso   = cola.resumen?.en_proceso  ?? 0;
  const empanadas   = cola.resumen?.total_empanadas_pendientes ?? 0;
  const criticos    = metricas?.insumos_criticos ?? 0;

  const hh = lastSync
    ? lastSync.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Chip de alerta de insumos críticos */}
      {criticos > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Chip
            icon={<WarningAmberIcon />}
            label={`${criticos} insumo${criticos > 1 ? "s" : ""} crítico${criticos > 1 ? "s" : ""}`}
            size="small"
            onClick={() => setTab(2)}
            sx={{
              background: alpha("#E53935", 0.1),
              color: "#E53935",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              "&:hover": { background: alpha("#E53935", 0.18) },
            }}
          />
        </Box>
      )}

      {/* ── Métricas del día ────────────────────────────────── */}
      <Grid container spacing={1.5}>
        {[
          {
            label:   "Pendientes",
            value:   loadingCola ? "—" : pendientes,
            color:   "#FF9800",
            icon:    <PendingIcon />,
            loading: loadingCola,
          },
          {
            label:   "En proceso",
            value:   loadingCola ? "—" : enProceso,
            color:   "#023C81",
            icon:    <LocalFireDepartmentIcon />,
            loading: loadingCola,
          },
          {
            label:   "Empanadas en cola",
            value:   loadingCola ? "—" : empanadas,
            color:   "#8B4513",
            icon:    <RestaurantIcon />,
            loading: loadingCola,
          },
          {
            label:   "Producidas hoy",
            value:   loadingMetricas ? "—" : (metricas?.produccion?.empanadas_producidas ?? 0),
            color:   "#18A558",
            icon:    <CheckCircleIcon />,
            loading: loadingMetricas,
          },
          {
            label:   "Tiempo prom.",
            value:   loadingMetricas ? "—" : `${metricas?.tiempos?.min_promedio_produccion ?? 0} min`,
            color:   "#7B1FA2",
            icon:    <AccessTimeIcon />,
            sub:     metricas?.tiempos?.min_promedio_produccion > 0
                       ? `Rápido: ${metricas.tiempos.min_mas_rapido} min`
                       : null,
            loading: loadingMetricas,
          },
          {
            label:   "Capacidad",
            value:   loadingMetricas || !metricas?.capacidad?.limite_empanadas
                       ? "Ilimitada"
                       : `${metricas.capacidad.empanadas_vendidas}/${metricas.capacidad.limite_empanadas}`,
            color:   "#023C81",
            icon:    <CheckCircleIcon />,
            sub:     metricas?.capacidad?.acepta_pedidos === false ? "⛔ Cerrado" : null,
            loading: loadingMetricas,
          },
        ].map((m) => (
          <Grid item xs={6} sm={4} md={2} key={m.label}>
            <MetricaCard {...m} />
          </Grid>
        ))}
      </Grid>

      {/* Error de carga */}
      {error && (
        <Alert severity="error" onClose={() => {}} sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      )}

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: "1.5px solid", borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTab-root": {
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "none",
              minHeight: 44,
            },
            "& .Mui-selected": { color: "#023C81 !important" },
            "& .MuiTabs-indicator": { background: "#023C81", height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          <Tab
            label={
              <Badge badgeContent={pendientes + enProceso} color="error" max={99}
                sx={{ "& .MuiBadge-badge": { fontSize: 9, minWidth: 16, height: 16 } }}>
                <Box sx={{ pr: pendientes + enProceso > 0 ? 1.5 : 0 }}>Cola de pedidos</Box>
              </Badge>
            }
          />
          <Tab label="Historial del día" />
          <Tab
            label={
              <Badge badgeContent={criticos || null} color="error" max={99}
                sx={{ "& .MuiBadge-badge": { fontSize: 9, minWidth: 16, height: 16 } }}>
                <Box sx={{ pr: criticos > 0 ? 1.5 : 0 }}>Insumos</Box>
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {/* ── Contenido por tab ─────────────────────────────── */}
      {tab === 0 && (
        <ColaTab
          pedidos={cola.pedidos}
          loading={loadingCola}
          reload={reload}
        />
      )}
      {tab === 1 && <HistorialTab />}
      {tab === 2 && <InsumosTab   />}
    </Box>
  );
}