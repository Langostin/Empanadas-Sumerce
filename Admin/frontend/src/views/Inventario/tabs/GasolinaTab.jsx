// src/views/Inventario/tabs/GasolinaTab.jsx
import { Box, Card, CardContent, Grid, Typography, MenuItem, TextField, Chip, Skeleton, alpha } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGasolina } from "../../../controllers/useInventario";
import { MESES } from "../../../models";

const AÑOS = [2024, 2025, 2026];

export default function GasolinaTab() {
  const { gastos, porRepartidor, loading, filtros, setFiltros } = useGasolina({
    mes:  new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });

  const totalMes = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

      {/* Filtros */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="subtitle1" sx={{ fontFamily: "sans-serif", fontWeight: 700, flexGrow: 1 }}>
            ⛽ Gastos de gasolina — Repartidores
          </Typography>
          <TextField size="small" select label="Mes" value={filtros.mes || ""}
            onChange={e => setFiltros(f => ({ ...f, mes: e.target.value || undefined }))}
            sx={{ width: 130 }} InputProps={{ sx: { borderRadius: 2 } }}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Año" value={filtros.anio || ""}
            onChange={e => setFiltros(f => ({ ...f, anio: e.target.value || undefined }))}
            sx={{ width: 110 }} InputProps={{ sx: { borderRadius: 2 } }}>
            <MenuItem value="">Todos</MenuItem>
            {AÑOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
        </Box>
      </Card>

      {/* KPI */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: "linear-gradient(135deg,#023C81,#1254A8)", color: "#fff" }}>
            <CardContent sx={{ "&:last-child": { pb: 2 }, py: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Total del período</Typography>
              <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>
                ${totalMes.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: "linear-gradient(135deg,#FF9800,#E65100)", color: "#fff" }}>
            <CardContent sx={{ "&:last-child": { pb: 2 }, py: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Registros</Typography>
              <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>
                {gastos.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: "linear-gradient(135deg,#18A558,#0A7A3A)", color: "#fff" }}>
            <CardContent sx={{ "&:last-child": { pb: 2 }, py: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Promedio por registro</Typography>
              <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>
                ${gastos.length ? (totalMes / gastos.length).toFixed(0) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Por repartidor */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Por repartidor
              </Typography>
              {loading ? [1,2,3].map(i => <Skeleton key={i} height={48} sx={{ borderRadius: 2, mb: 1 }} />) :
              !porRepartidor.length ? (
                <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Sin registros</Typography>
              ) : porRepartidor.map((r, i) => (
                <Box key={r.empleado_id || i}
                  sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.2,
                        borderBottom: "1px solid rgba(0,0,0,0.05)", "&:last-child": { borderBottom: "none" } }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#023C81,#1254A8)",
                               display: "flex", alignItems: "center", justifyContent: "center",
                               color: "#fff", fontFamily: "sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {(r.empleado || "?")[0]?.toUpperCase()}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{r.empleado || "Sin asignar"}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.registros} carga{r.registros !== 1 ? "s" : ""}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81" }}>
                    ${Number(r.total_mxn || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfica por fecha */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Gastos por fecha
              </Typography>
              {loading ? <Skeleton height={200} sx={{ borderRadius: 2 }} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gastos.slice(0, 20).reverse().map(g => ({
                    fecha: new Date(g.fecha_gasto).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
                    monto: g.monto,
                    nombre: g.empleado,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,60,129,0.06)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#4A5B72" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#4A5B72" }} />
                    <Tooltip formatter={v => [`$${v}`, "Monto"]} />
                    <Bar dataKey="monto" fill="#FF9800" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Tabla de registros */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Registros detallados
              </Typography>
              {loading ? <Skeleton height={200} /> :
              !gastos.length ? (
                <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Sin registros en el período seleccionado</Typography>
              ) : gastos.map(g => (
                <Box key={g.gasto_id}
                  sx={{ display: "flex", gap: 2, py: 1.2, borderBottom: "1px solid rgba(0,0,0,0.05)",
                        "&:last-child": { borderBottom: "none" }, alignItems: "center" }}>
                  <Box sx={{ fontSize: 20 }}>⛽</Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                      {g.descripcion || "Gasolina"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {g.empleado} · {new Date(g.fecha_gasto).toLocaleDateString("es-MX")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#FF9800" }}>
                    ${Number(g.monto).toLocaleString("es-MX")}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}