// src/views/Inventario/tabs/ExistenciasTab.jsx
import { useState, useEffect } from "react";
import {
  Box, Grid, Card, CardContent, Typography, TextField, InputAdornment,
  Chip, IconButton, Tooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Alert, Skeleton, LinearProgress, alpha,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon    from "@mui/icons-material/SearchRounded";
import AddIcon       from "@mui/icons-material/AddRounded";
import EditIcon      from "@mui/icons-material/EditRounded";
import SwapVertIcon  from "@mui/icons-material/SwapVertRounded";
import HistoryIcon   from "@mui/icons-material/HistoryRounded";
import InventoryIcon from "@mui/icons-material/Inventory2Rounded";
import WarningIcon from "@mui/icons-material/WarningAmberRounded";
import BlockIcon from "@mui/icons-material/BlockRounded";
import AttachMoneyIcon from "@mui/icons-material/AttachMoneyRounded";
import AssignmentIcon from "@mui/icons-material/AssignmentRounded";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUpRounded";
import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDownRounded";
import { useInsumos } from "../../../controllers/useInventario";
import { inventarioService } from "../../../services/inventarioService";

// ── Colores del semáforo de stock ──────────────────────────────
const SEMAFORO = {
  ok:      { bg: alpha("#18A558", 0.12), color: "#18A558", label: "OK" },
  bajo:    { bg: alpha("#FF9800", 0.12), color: "#E65100", label: "Bajo" },
  critico: { bg: alpha("#E53935", 0.12), color: "#E53935", label: "Crítico" },
  agotado: { bg: alpha("#7B1FA2", 0.12), color: "#7B1FA2", label: "Agotado" },
};

// ── Tarjetas de resumen ────────────────────────────────────────
function ResumenCards({ resumen, loading }) {
    const cards = [
    { label: "Total insumos", value: resumen?.total_insumos ?? 0, icon: <InventoryIcon />, color: "#023C81" },
    { label: "Críticos", value: resumen?.criticos ?? 0, icon: <WarningIcon />, color: "#E53935" },
    { label: "Agotados", value: resumen?.agotados ?? 0, icon: <BlockIcon />, color: "#7B1FA2" },
    {
        label: "Valor inventario",
        value: `$${Number(resumen?.valor_total ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
        icon: <AttachMoneyIcon />,
        color: "#18A558"
    },
    ];

  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      {cards.map(c => (
        <Grid item xs={6} md={3} key={c.label}>
          <Card sx={{ background: `linear-gradient(135deg, ${c.color}, ${alpha(c.color, 0.75)})`, color: "#fff", position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", right: -20, opacity: 0.12, "& svg": { fontSize: 90 } }}>{c.icon}</Box>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              {loading ? <Skeleton sx={{ bgcolor: "rgba(255,255,255,0.3)" }} /> : (
                <Typography variant="h4" sx={{ fontFamily: "sans-serif", fontWeight: 800, lineHeight: 1 }}>
                  {c.value}
                </Typography>
              )}
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: 11 }}>{c.label}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ── Dialog: Registrar movimiento ───────────────────────────────
function MovimientoDialog({ open, onClose, insumo, onDone }) {
  const [tipos,    setTipos]    = useState([]);
  const [form,     setForm]     = useState({ tipo_mov_id: 1, cantidad: "", costo_unitario: "", motivo: "" });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  useEffect(() => {
    inventarioService.getTiposMovimiento().then(setTipos).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.cantidad || parseFloat(form.cantidad) <= 0) { setErr("Cantidad inválida."); return; }
    setSaving(true); setErr("");
    try {
      await inventarioService.registrarMovimiento({
        insumo_id:     insumo.insumo_id,
        tipo_mov_id:   parseInt(form.tipo_mov_id),
        cantidad:      parseFloat(form.cantidad),
        costo_unitario: form.costo_unitario ? parseFloat(form.costo_unitario) : null,
        motivo:        form.motivo || null,
      });
      onDone();
      onClose();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const esEntrada = tipos.find(t => t.tipo_mov_id === parseInt(form.tipo_mov_id))?.es_entrada;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 800, alignItems: "center", display: "flex", gap: 1 }}>
        <InventoryIcon /> Movimiento de inventario
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {insumo && (
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha("#023C81", 0.05), mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#023C81" }}>{insumo.nombre}</Typography>
            <Typography variant="caption" color="text.secondary">
              Stock actual: {insumo.stock_actual} {insumo.unidad_clave}
            </Typography>
          </Box>
        )}
        {err && <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>}
        <TextField fullWidth size="small" select label="Tipo de movimiento"
          value={form.tipo_mov_id} onChange={e => set("tipo_mov_id", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }}>
          {tipos.map(t => (
            <MenuItem key={t.tipo_mov_id} value={t.tipo_mov_id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: t.es_entrada ? "#18A558" : "#E53935" }} />
                {t.nombre}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <TextField fullWidth size="small" label="Cantidad *" type="number"
          value={form.cantidad} onChange={e => set("cantidad", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }} />
        {esEntrada && (
          <TextField fullWidth size="small" label="Costo unitario (MXN)" type="number"
            value={form.costo_unitario} onChange={e => set("costo_unitario", e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }} />
        )}
        <TextField fullWidth size="small" label="Motivo / Notas" multiline rows={2}
          value={form.motivo} onChange={e => set("motivo", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }} />
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

// ── Dialog: Historial de movimientos ──────────────────────────
function HistorialDialog({ open, onClose, insumo }) {
  const [movs,    setMovs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !insumo) return;
    setLoading(true);
    inventarioService.getMovimientos(insumo.insumo_id)
      .then(setMovs).catch(() => {}).finally(() => setLoading(false));
  }, [open, insumo]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 800, alignItems: "center", display: "flex", gap: 1 }}>
        <AssignmentIcon /> Historial — {insumo?.nombre}
      </DialogTitle>
      <DialogContent>
        {loading ? <Skeleton height={200} /> : !movs.length ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Sin movimientos registrados</Typography>
        ) : movs.map(m => (
          <Box key={m.movimiento_id}
            sx={{ display: "flex", gap: 2, py: 1.2, borderBottom: "1px solid rgba(0,0,0,0.05)", alignItems: "flex-start" }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: m.es_entrada ? alpha("#18A558", 0.12) : alpha("#E53935", 0.12),
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {m.es_entrada ? <ArrowCircleUpIcon /> : <ArrowCircleDownIcon />}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{m.tipo_movimiento}</Typography>
              <Typography variant="caption" color="text.secondary">
                {m.cantidad} uds{m.costo_unitario ? ` · $${m.costo_unitario}/ud` : ""}
                {m.motivo ? ` · ${m.motivo}` : ""}
              </Typography>
              {m.empleado && <Typography variant="caption" sx={{ display: "block", color: "#023C81", fontSize: 10 }}>👤 {m.empleado}</Typography>}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, whiteSpace: "nowrap" }}>
              {new Date(m.fecha_movimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Typography>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Crear / Editar insumo ──────────────────────────────
const EMPTY_INSUMO = { nombre: "", descripcion: "", unidad_id: 1, proveedor_id: "", stock_actual: 0, stock_minimo: 0, costo_unitario: 0 };

function InsumoForm({ open, onClose, initial, onSave }) {
  const [unidades,   setUnidades]   = useState([]);
  const [proveedores,setProveedores]= useState([]);
  const [form,       setForm]       = useState(initial || EMPTY_INSUMO);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");

  useEffect(() => {
    Promise.all([inventarioService.getUnidades(), inventarioService.getProveedores()])
      .then(([u, p]) => { setUnidades(u); setProveedores(p); }).catch(() => {});
    setForm(initial || EMPTY_INSUMO);
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre) { setErr("El nombre es requerido."); return; }
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 800 }}>
        {initial?.insumo_id ? (
        <>
            <EditIcon sx={{ fontSize: 18, mr: 0.5 }} />
            Editar insumo
        </>
        ) : (
        <>
            <AddIcon sx={{ fontSize: 18, mr: 0.5 }} />
            Nuevo insumo
        </>
        )}
      </DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set("nombre", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion || ""}
              onChange={e => set("descripcion", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" select label="Unidad de medida *" value={form.unidad_id}
              onChange={e => set("unidad_id", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }}>
              {unidades.map(u => <MenuItem key={u.unidad_id} value={u.unidad_id}>{u.clave} — {u.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" select label="Proveedor" value={form.proveedor_id || ""}
              onChange={e => set("proveedor_id", e.target.value)} InputProps={{ sx: { borderRadius: 2 } }}>
              <MenuItem value="">Sin proveedor</MenuItem>
              {proveedores.map(p => <MenuItem key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          {[
            { label: "Stock actual",   key: "stock_actual",   xs: 4 },
            { label: "Stock mínimo",   key: "stock_minimo",   xs: 4 },
            { label: "Costo unitario", key: "costo_unitario", xs: 4 },
          ].map(f => (
            <Grid item xs={f.xs} key={f.key}>
              <TextField fullWidth size="small" label={f.label} type="number"
                value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                InputProps={{ sx: { borderRadius: 2 } }} />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#023C81,#1254A8)", fontFamily: "sans-serif", fontWeight: 700 }}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Vista principal ────────────────────────────────────────────
export default function ExistenciasTab() {
  const { insumos, resumen, loading, error, search, setSearch, create, update, reload } = useInsumos();

  const [formOpen,  setFormOpen]  = useState(false);
  const [formInit,  setFormInit]  = useState(null);
  const [movInsumo, setMovInsumo] = useState(null);
  const [histInsumo,setHistInsumo]= useState(null);

  const handleSave = async (data) => {
    if (data.insumo_id) await update(data.insumo_id, data);
    else                await create(data);
  };

  const columns = [
    {
      field: "nombre", headerName: "Insumo", flex: 1.5, minWidth: 180,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>{row.nombre}</Typography>
          {row.proveedor && <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}> {row.proveedor}</Typography>}
        </Box>
      ),
    },
    {
      field: "stock_actual", headerName: "Stock actual", width: 130, align: "center", headerAlign: "center",
      renderCell: ({ row }) => (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: SEMAFORO[row.estado_stock]?.color }}>
              {row.stock_actual}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, color: "#4A5B72" }}>{row.unidad_clave}</Typography>
          </Box>
          <LinearProgress variant="determinate"
            value={Math.min((row.stock_actual / Math.max(row.stock_minimo * 2, 0.01)) * 100, 100)}
            sx={{
              height: 4, borderRadius: 2,
              bgcolor: alpha(SEMAFORO[row.estado_stock]?.color || "#ccc", 0.15),
              "& .MuiLinearProgress-bar": { bgcolor: SEMAFORO[row.estado_stock]?.color || "#ccc", borderRadius: 2 },
            }}
          />
        </Box>
      ),
    },
    {
      field: "stock_minimo", headerName: "Mínimo", width: 90, align: "center", headerAlign: "center",
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontSize: 12 }}>{row.stock_minimo} {row.unidad_clave}</Typography>
      ),
    },
    {
      field: "estado_stock", headerName: "Estado", width: 100, align: "center", headerAlign: "center",
      renderCell: ({ value }) => {
        const s = SEMAFORO[value] || SEMAFORO.ok;
        return <Chip label={s.label} size="small" sx={{ background: s.bg, color: s.color, fontWeight: 700, fontSize: 10 }} />;
      },
    },
    {
      field: "costo_unitario", headerName: "Costo/ud", width: 100, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#023C81", fontSize: 12 }}>
          ${Number(value || 0).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: "valor_inventario", headerName: "Valor total", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, color: "#18A558" }}>
          ${Number(value || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
        </Typography>
      ),
    },
    {
      field: "acciones", headerName: "Acciones", width: 130, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Registrar movimiento">
            <IconButton size="small" onClick={() => setMovInsumo(row)} sx={{ color: "#023C81" }}>
              <SwapVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ver historial">
            <IconButton size="small" onClick={() => setHistInsumo(row)} sx={{ color: "#4A5B72" }}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar insumo">
            <IconButton size="small" onClick={() => { setFormInit(row); setFormOpen(true); }} sx={{ color: "#FF9800" }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <ResumenCards resumen={resumen} loading={loading} />

      {/* Barra de búsqueda + acción */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Buscar insumo..."
            value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#4A5B72", fontSize: 18 }} /></InputAdornment>,
              sx: { borderRadius: 2.5 },
            }} />
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setFormInit(null); setFormOpen(true); }}
            sx={{ borderRadius: 2.5, background: "linear-gradient(135deg,#023C81,#1254A8)", fontFamily: "sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
            Nuevo insumo
          </Button>
        </Box>
      </Card>

      {/* Tabla */}
      <Card>
        <DataGrid rows={insumos} columns={columns} getRowId={r => r.insumo_id}
          loading={loading} autoHeight disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{ "& .MuiDataGrid-cell": { borderColor: "rgba(2,60,129,0.05)" } }} />
      </Card>

      {/* Dialogs */}
      <InsumoForm open={formOpen} onClose={() => setFormOpen(false)} initial={formInit} onSave={handleSave} />
      <MovimientoDialog open={!!movInsumo} onClose={() => setMovInsumo(null)} insumo={movInsumo} onDone={reload} />
      <HistorialDialog  open={!!histInsumo} onClose={() => setHistInsumo(null)} insumo={histInsumo} />
    </Box>
  );
}