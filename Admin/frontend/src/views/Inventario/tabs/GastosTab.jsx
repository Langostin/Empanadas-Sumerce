// src/views/Inventario/tabs/GastosTab.jsx
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Grid, Typography, TextField, MenuItem, Button,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Skeleton, Chip, Tooltip, alpha,
} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import AddIcon    from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import { useGastos } from "../../../controllers/useInventario";
import { inventarioService } from "../../../services/inventarioService";
import { MESES } from "../../../models";

const AÑOS = [2024, 2025, 2026];
const COLORS_PIE = ["#023C81","#FF9800","#18A558","#E53935","#9C27B0","#FED817","#00BCD4","#795548","#607D8B","#F06292","#8BC34A"];

// ── Dialog: Nuevo gasto ────────────────────────────────────────
function NuevoGastoDialog({ open, onClose, onSave }) {
  const [tipos, setTipos] = useState([]);
  const [form,  setForm]  = useState({ tipo_gasto_id: "", descripcion: "", monto: "", fecha_gasto: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    inventarioService.getTiposGasto().then(setTipos).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.tipo_gasto_id || !form.monto || parseFloat(form.monto) <= 0) {
      setErr("Tipo de gasto y monto son requeridos."); return;
    }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, monto: parseFloat(form.monto) });
      setForm({ tipo_gasto_id: "", descripcion: "", monto: "", fecha_gasto: new Date().toISOString().split("T")[0] });
      onClose();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>➕ Registrar gasto</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {err && <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>}
        <TextField fullWidth size="small" select label="Tipo de gasto *" value={form.tipo_gasto_id}
          onChange={e => set("tipo_gasto_id", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }}>
          {tipos.map(t => <MenuItem key={t.tipo_gasto_id} value={t.tipo_gasto_id}>{t.nombre}</MenuItem>)}
        </TextField>
        <TextField fullWidth size="small" label="Descripción / Detalle" value={form.descripcion}
          onChange={e => set("descripcion", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
        <TextField fullWidth size="small" label="Monto (MXN) *" type="number" value={form.monto}
          onChange={e => set("monto", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
        <TextField fullWidth size="small" label="Fecha del gasto" type="date" value={form.fecha_gasto}
          onChange={e => set("fecha_gasto", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }}
          InputLabelProps={{ shrink: true }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#023C81,#1254A8)", fontFamily: "sans-serif", fontWeight: 700 }}>
          {saving ? "Guardando..." : "Registrar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function GastosTab() {
  const {
    gastos, porTipo, loading, error,
    filtros, setFiltros,
    create, remove,
  } = useGastos({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });

  const [formOpen,     setFormOpen]     = useState(false);
  const [deleteConfirm,setDeleteConfirm]= useState(null);

  const totalPeriodo = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  const TIPO_GASTO_EMOJIS = {
    1: "🌽", 2: "⛽", 3: "💼", 4: "💸", 5: "💻",
    6: "💳", 7: "📦", 8: "🔧", 9: "🏠", 10: "📣", 11: "📝",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Filtros */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="subtitle1" sx={{ fontFamily: "sans-serif", fontWeight: 700, flexGrow: 1 }}>
            💰 Gastos del negocio
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}
            sx={{ borderRadius: 2.5, background: "linear-gradient(135deg,#023C81,#1254A8)", fontFamily: "sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
            Nuevo gasto
          </Button>
        </Box>
      </Card>

      {/* KPI + gráfica */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Card sx={{ background: "linear-gradient(135deg,#023C81,#012459)", color: "#fff" }}>
              <CardContent sx={{ "&:last-child": { pb: 2 }, py: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Total del período</Typography>
                <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>
                  ${totalPeriodo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {gastos.length} registro{gastos.length !== 1 ? "s" : ""}
                </Typography>
              </CardContent>
            </Card>

            {/* Top 3 tipos */}
            {!loading && porTipo.slice(0, 3).map((t, i) => (
              <Card key={t.tipo_gasto_id}
                sx={{ border: `1px solid ${alpha(COLORS_PIE[i % COLORS_PIE.length], 0.3)}` }}>
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", gap: 2, alignItems: "center" }}>
                  <Typography sx={{ fontSize: 24 }}>{TIPO_GASTO_EMOJIS[t.tipo_gasto_id] || "📝"}</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{t.tipo}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.registros} registros</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: COLORS_PIE[i % COLORS_PIE.length] }}>
                    ${Number(t.total).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>

        {/* Donut */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 1 }}>
                Distribución por tipo
              </Typography>
              {loading ? <Skeleton height={250} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={porTipo} dataKey="total" nameKey="tipo" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {porTipo.map((_, i) => (
                        <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, n) => [`$${Number(v).toLocaleString("es-MX")}`, n]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de gastos */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", maxHeight: 400, overflow: "auto" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 700, mb: 2 }}>
                Registros recientes
              </Typography>
              {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} height={44} sx={{ borderRadius: 2, mb: 1 }} />) :
              !gastos.length ? (
                <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Sin registros</Typography>
              ) : gastos.slice(0, 25).map(g => (
                <Box key={g.gasto_id}
                  sx={{ display: "flex", gap: 1.5, py: 1, borderBottom: "1px solid rgba(0,0,0,0.04)",
                        "&:last-child": { borderBottom: "none" }, alignItems: "center" }}>
                  <Typography sx={{ fontSize: 18 }}>{TIPO_GASTO_EMOJIS[g.tipo_gasto_id] || "📝"}</Typography>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 11, lineHeight: 1.2 }} noWrap>
                      {g.descripcion || g.tipo_gasto}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                      {new Date(g.fecha_gasto).toLocaleDateString("es-MX")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#E53935", fontSize: 12, whiteSpace: "nowrap" }}>
                    -${Number(g.monto).toLocaleString("es-MX")}
                  </Typography>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => setDeleteConfirm(g)} sx={{ color: "#aaa", "&:hover": { color: "#E53935" } }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <NuevoGastoDialog open={formOpen} onClose={() => setFormOpen(false)} onSave={create} />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: "sans-serif" }}>¿Eliminar gasto?</DialogTitle>
        <DialogContent>
          <Typography>Se eliminará el gasto de <strong>${Number(deleteConfirm?.monto || 0).toLocaleString("es-MX")}</strong> — {deleteConfirm?.descripcion || deleteConfirm?.tipo_gasto}.</Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={async () => { await remove(deleteConfirm.gasto_id); setDeleteConfirm(null); }}
            variant="contained" color="error" sx={{ borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}