// src/views/Inventario/tabs/HistoricoTab.jsx
import { Box, Card, CardContent, Grid, Typography, TextField, MenuItem, Chip, Skeleton, alpha } from "@mui/material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from "recharts";
import { useHistoricoCortes } from "../../../controllers/useInventario";
import { MESES } from "../../../models";
import { DataGrid } from "@mui/x-data-grid";

const AÑOS = [2024, 2025, 2026];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: "#023C81", color: "#fff", borderRadius: 2, p: 1.5, fontSize: 12, minWidth: 160 }}>
      <strong>{MESES[(label || 1) - 1] || label}</strong>
      {payload.map(p => (
        <Box key={p.dataKey}>
          {p.name}: <strong>${Number(p.value).toLocaleString("es-MX", { maximumFractionDigits: 0 })}</strong>
        </Box>
      ))}
    </Box>
  );
};

export default function HistoricoTab() {
  const { cortes, acumulado, mensual, loading, filtros, setFiltros } = useHistoricoCortes();

  const pesos = v => `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const columns = [
    {
      field: "fecha_corte", headerName: "Fecha", width: 120,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 12 }}>
          {new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
        </Typography>
      ),
    },
    {
      field: "total_pedidos", headerName: "Pedidos", width: 90, align: "center", headerAlign: "center",
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ background: alpha("#023C81", 0.1), color: "#023C81", fontWeight: 700, fontSize: 11 }} />
      ),
    },
    {
      field: "total_ventas", headerName: "Ventas", width: 120, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558", fontSize: 12 }}>
          {pesos(value)}
        </Typography>
      ),
    },
    {
      field: "total_efectivo", headerName: "Efectivo", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => <Typography variant="caption" sx={{ fontWeight: 600 }}>{pesos(value)}</Typography>,
    },
    {
      field: "total_tarjeta", headerName: "Tarjeta", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => <Typography variant="caption" sx={{ fontWeight: 600 }}>{pesos(value)}</Typography>,
    },
    {
      field: "total_gastos", headerName: "Gastos", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#E53935", fontSize: 12 }}>{pesos(value)}</Typography>
      ),
    },
    {
      field: "utilidad_bruta", headerName: "Utilidad", width: 120, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="body2"
          sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 12,
                color: value >= 0 ? "#18A558" : "#E53935" }}>
          {pesos(value)}
        </Typography>
      ),
    },
    {
      field: "reserva_impuestos", headerName: "Reserva IVA", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => <Typography variant="caption" sx={{ fontWeight: 600, color: "#FF9800" }}>{pesos(value)}</Typography>,
    },
    {
      field: "empleado", headerName: "Registrado por", flex: 1, minWidth: 140,
      renderCell: ({ value }) => <Typography variant="caption" color="text.secondary">{value || "—"}</Typography>,
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

      {/* Filtro de año */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="subtitle1" sx={{ fontFamily: "sans-serif", fontWeight: 700, flexGrow: 1 }}>
            📅 Histórico de cortes de caja
          </Typography>
          <TextField size="small" select label="Año" value={filtros.anio || ""}
            onChange={e => setFiltros(f => ({ ...f, anio: e.target.value }))}
            sx={{ width: 110 }} InputProps={{ sx: { borderRadius: 2 } }}>
            {AÑOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Mes" value={filtros.mes || ""}
            onChange={e => setFiltros(f => ({ ...f, mes: e.target.value || undefined }))}
            sx={{ width: 130 }} InputProps={{ sx: { borderRadius: 2 } }}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </TextField>
        </Box>
      </Card>

      {/* Acumulado del año */}
      <Grid container spacing={2}>
        {[
          { label: "Ventas acumuladas",  value: pesos(acumulado?.ventas_acum),    color: "#023C81", emoji: "💰" },
          { label: "Gastos acumulados",  value: pesos(acumulado?.gastos_acum),    color: "#E53935", emoji: "📤" },
          { label: "Utilidad acumulada", value: pesos(acumulado?.utilidad_acum),  color: "#18A558", emoji: "📈" },
          { label: "Impuestos reservados",value: pesos(acumulado?.impuestos_acum),color: "#FF9800", emoji: "🏛️" },
          { label: "Pedidos totales",    value: acumulado?.pedidos_acum ?? 0,     color: "#1254A8", emoji: "🥟" },
          { label: "Días con corte",     value: acumulado?.dias_con_corte ?? 0,   color: "#4A5B72", emoji: "📋" },
        ].map(c => (
          <Grid item xs={6} md={4} lg={2} key={c.label}>
            {loading ? <Skeleton height={90} sx={{ borderRadius: 3 }} /> : (
              <Box sx={{ p: 1.8, borderRadius: 3, background: alpha(c.color, 0.06),
                          border: `1px solid ${alpha(c.color, 0.18)}`, textAlign: "center" }}>
                <Typography sx={{ fontSize: 24 }}>{c.emoji}</Typography>
                <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: c.color, lineHeight: 1.1, fontSize: 16 }}>
                  {c.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>{c.label}</Typography>
              </Box>
            )}
          </Grid>
        ))}
      </Grid>

      {/* Gráfica mensual */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Ventas vs Gastos por mes
              </Typography>
              {loading ? <Skeleton height={240} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={mensual.map(m => ({ ...m, label: MESES[(m.mes || 1) - 1] }))}>
                    <defs>
                      <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#023C81" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#023C81" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E53935" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#E53935" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,60,129,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4A5B72" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#4A5B72" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} />
                    <Area type="monotone" dataKey="ventas"   name="Ventas"   stroke="#023C81" fill="url(#gVentas)"  strokeWidth={2.5} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="gastos"   name="Gastos"   stroke="#E53935" fill="url(#gGastos)"  strokeWidth={2}   dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="utilidad" name="Utilidad" stroke="#18A558" fill="none"            strokeWidth={2}   strokeDasharray="5 3" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Pedidos por mes
              </Typography>
              {loading ? <Skeleton height={240} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={mensual.map(m => ({ ...m, label: MESES[(m.mes || 1) - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,60,129,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4A5B72" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#4A5B72" }} />
                    <Tooltip />
                    <Bar dataKey="pedidos" name="Pedidos" fill="#FED817" stroke="#C9AC0E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de cortes */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
            Detalle de cortes
          </Typography>
          <DataGrid
            rows={cortes} columns={columns} getRowId={r => r.corte_id}
            loading={loading} autoHeight disableRowSelectionOnClick
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ "& .MuiDataGrid-cell": { borderColor: "rgba(2,60,129,0.05)" } }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}