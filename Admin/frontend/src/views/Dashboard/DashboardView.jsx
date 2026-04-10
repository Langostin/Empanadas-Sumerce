// src/views/Dashboard/DashboardView.jsx
import { Grid, Box, Card, CardContent, Typography, Avatar, Chip, Skeleton, Alert, alpha } from "@mui/material";
import PeopleIcon       from "@mui/icons-material/PeopleAltRounded";
import BadgeIcon        from "@mui/icons-material/BadgeRounded";
import ShoppingIcon     from "@mui/icons-material/ShoppingBagRounded";
import EventIcon        from "@mui/icons-material/CelebrationRounded";
import MoneyIcon        from "@mui/icons-material/AttachMoneyRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import { useDashboard } from "../../controllers/useDashboard";
import StatCard         from "../../components/Charts/StatCard";
import { VentasMesChart, EstadosPedidoChart } from "../../components/Charts/VentasMesChart";
import { ESTADO_PEDIDO_COLORS } from "../../models";

function LoadingCards() {
  return Array.from({ length: 4 }).map((_, i) => (
    <Grid item xs={12} sm={6} lg={3} key={i}>
      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
    </Grid>
  ));
}

export default function DashboardView() {
  const { metricas, estadosPedido, hoy, loading, error } = useDashboard();

  if (error) return (
    <Alert severity="error" sx={{ borderRadius: 3 }}>
      Error al cargar métricas: {error}
    </Alert>
  );

  const pesos = v => `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

      {/* ── Tarjetas hoy ─────────────────────────── */}
      {hoy && !loading && (
        <Box
          sx={{
            background: "linear-gradient(135deg, #023C81, #012459)",
            borderRadius: 1, p: 3, color: "#fff",
            display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 14, display: "block" }}>
              HOY
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 700 }}>
              {pesos(hoy.ingresos)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>Ingresos del día</Typography>
          </Box>
          {[
            { label: "Pedidos hoy", value: hoy.pedidos },
            { label: "Efectivo", value: pesos(hoy.efectivo) },
            { label: "Tarjeta", value: pesos(hoy.tarjeta) },
          ].map(item => (
            <Box key={item.label} sx={{ textAlign: "center", minWidth: 100 }}>
              <Typography variant="h5" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#ffffff" }}>
                {item.value}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 14 }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Stat Cards ───────────────────────────── */}
      <Grid container spacing={2.5}>
        {loading ? <LoadingCards /> : (
          <>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title="Total Clientes"  value={metricas?.totalClientes}  icon={<PeopleIcon />} color="#023C81" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title="Total Empleados" value={metricas?.totalEmpleados} icon={<BadgeIcon />} color="#1254A8" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title="Total Pedidos"   value={metricas?.totalPedidos}   icon={<ShoppingIcon />} color="#0D2D5E" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Ingresos Totales"
                value={metricas?.totalIngresos}
                icon={<MoneyIcon />}
                color="#18A558"
                formatter={v => `$${Number(v||0).toLocaleString("es-MX",{maximumFractionDigits:0})}`}
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* ── Charts ───────────────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          {loading ? <Skeleton variant="rectangular" height={310} sx={{ borderRadius: 3 }} /> :
            <VentasMesChart data={metricas?.ventasMes || []} />}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? <Skeleton variant="rectangular" height={310} sx={{ borderRadius: 3 }} /> :
            <EstadosPedidoChart data={estadosPedido} />}
        </Grid>
      </Grid>

      {/* ── Top Clientes + Eventos ───────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "sans-serif" }}>
                <EmojiEventsIcon sx={{ verticalAlign: "middle", mr: 1 }} /> Top 5 Clientes
              </Typography>
              {loading ? Array.from({length:5}).map((_,i) => (
                <Skeleton key={i} height={52} sx={{ borderRadius: 2, mb: 1 }} />
              )) : (metricas?.topClientes || []).map((c, i) => (
                <Box
                  key={c.whatsapp}
                  sx={{
                    display: "flex", alignItems: "center", gap: 2, py: 1.2, px: 1.5,
                    borderRadius: 2, mb: 0.5,
                    background: i === 0 ? alpha("#FED817", 0.10) : "transparent",
                    "&:hover": { background: alpha("#023C81", 0.04) },
                    transition: "background 0.15s",
                  }}
                >
                  <Box
                    sx={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: i === 0 ? "linear-gradient(135deg,#FED817,#C9AC0E)" : alpha("#023C81",0.1),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "sans-serif", fontWeight: 500, fontSize: 12,
                      color: i === 0 ? "#023C81" : "#4A5B72",
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Avatar sx={{ width: 34, height: 34, background: alpha("#023C81", 0.12), color: "#023C81", fontSize: 13, fontWeight: 400 }}>
                    {(c.nombre || "?")[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#0D1B2E", fontSize: 13 }}>{c.nombre}</Typography>
                    <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11 }}>{c.whatsapp}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 500, color: "#023C81", fontSize: 13 }}>
                      ${Number(c.total_gastado||0).toLocaleString("es-MX",{maximumFractionDigits:0})}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>{c.total_pedidos} pedidos</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ background: "linear-gradient(135deg,#023C81,#012459)", color: "#fff", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "sans-serif", color: "#FED817" }}>
                <EventIcon sx={{ verticalAlign: "middle", mr: 1 }} /> Pedidos para Eventos
              </Typography>
              {loading ? <Skeleton height={80} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} /> : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="h2" sx={{ fontFamily: "sans-serif", fontWeight: 500, color: "#FED817" }}>
                    {metricas?.totalEventos ?? 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                    eventos atendidos
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}