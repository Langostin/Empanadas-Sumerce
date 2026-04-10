// src/components/Charts/VentasMesChart.jsx
import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { MESES } from "../../models";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: "#023C81", color: "#fff", borderRadius: 2, p: 1.5, fontSize: 12 }}>
      <strong>{MESES[(label || 1) - 1]}</strong>
      <Box>Pedidos: <strong>{payload[0]?.value}</strong></Box>
      <Box>Ingresos: <strong>${payload[1]?.value?.toLocaleString("es-MX")}</strong></Box>
    </Box>
  );
};

export function VentasMesChart({ data = [] }) {
  const chartData = data.map(d => ({
    mes: d.mes,
    label: MESES[(d.mes || 1) - 1],
    pedidos: d.pedidos,
    ingresos: d.ingresos,
  }));

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: "'Syne',sans-serif" }}>
          Ventas por Mes — {new Date().getFullYear()}
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#023C81" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#023C81" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FED817" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#FED817" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,60,129,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4A5B72" }} />
            <YAxis tick={{ fontSize: 11, fill: "#4A5B72" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="pedidos"  stroke="#023C81" fill="url(#gradPedidos)"  strokeWidth={2.5} dot={{ r: 3, fill: "#023C81" }} />
            <Area type="monotone" dataKey="ingresos" stroke="#FED817" fill="url(#gradIngresos)" strokeWidth={2.5} dot={{ r: 3, fill: "#FED817" }} />
          </AreaChart>
        </ResponsiveContainer>
        <Box sx={{ display: "flex", gap: 3, mt: 1, justifyContent: "center" }}>
          {[{ color: "#023C81", label: "Pedidos" }, { color: "#FED817", label: "Ingresos ($)" }].map(i => (
            <Box key={i.label} sx={{ display: "flex", alignItems: "center", gap: 0.7, fontSize: 12 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: i.color }} />
              <Typography variant="caption" color="text.secondary">{i.label}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Donut chart para estados de pedido ────────────────────────
import { PieChart, Pie, Cell, Legend } from "recharts";
import { ESTADO_PEDIDO_COLORS } from "../../models";

export function EstadosPedidoChart({ data = [] }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, fontFamily: "'Syne',sans-serif" }}>
          Distribución de Pedidos
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="estado" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {data.map(entry => (
                <Cell key={entry.estado} fill={ESTADO_PEDIDO_COLORS[entry.estado] || "#ccc"} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconType="circle" iconSize={8} formatter={v => (
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#4A5B72" }}>{v}</span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}