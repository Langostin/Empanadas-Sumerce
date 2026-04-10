// src/views/Empleados/EmpleadosView.jsx
import { useState, useEffect } from "react";
import {
  Box, Card, TextField, InputAdornment, Chip, IconButton, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Typography, Avatar, MenuItem, Alert, Skeleton, alpha,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon   from "@mui/icons-material/SearchRounded";
import AddIcon      from "@mui/icons-material/AddRounded";
import EditIcon     from "@mui/icons-material/EditRounded";
import DeleteIcon   from "@mui/icons-material/DeleteRounded";
import InfoIcon     from "@mui/icons-material/InfoRounded";
import { useEmpleados, useEmpleadoMetricas } from "../../controllers/useEmpleados";

const ROL_COLORS = {
  administrador: "#023C81",
  cocina:        "#FF9800",
  repartidor:    "#18A558",
};

const EMPTY_FORM = {
  nombre:"", apellidos:"", email:"", telefono_whatsapp:"",
  sueldo_mensual:"", rol_id:3, username:"", activo:true,
};

// ── Form Dialog (crear/editar) ─────────────────────────────────
function EmpleadoForm({ open, onClose, onSave, initial, roles }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Cargar datos del empleado cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      if (initial?.empleado_id) {
        // Editar: cargar todos menos contraseña
        setForm({
          empleado_id: initial.empleado_id,
          nombre: initial.nombre || "",
          apellidos: initial.apellidos || "",
          email: initial.email || "",
          telefono_whatsapp: initial.telefono_whatsapp || "",
          sueldo_mensual: initial.sueldo_mensual || "",
          rol_id: initial.rol_id || 3,
          username: initial.username || "",
          activo: initial.activo ?? true,
          contrasena: "", // No cargar contraseña
        });
      } else {
        // Crear: form vacío
        setForm(EMPTY_FORM);
      }
      setErr("");
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const isEditing = form.empleado_id;
    
    if (!form.nombre || !form.apellidos || !form.rol_id) {
      setErr("Nombre, apellidos y rol son requeridos."); return;
    }

    // Contraseña obligatoria solo en creación
    if (!isEditing && !form.contrasena) {
      setErr("Contraseña es requerida para nuevos empleados."); return;
    }

    setSaving(true);
    setErr("");
    try {
      // Preparar datos a enviar: no enviar contraseña vacía en edición
      const dataToSend = { ...form };
      if (isEditing && !dataToSend.contrasena) {
        delete dataToSend.contrasena;
      }
      await onSave(dataToSend);
      onClose();
    }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:4 } }}>
      <DialogTitle sx={{ fontFamily:"sans-serif", fontWeight:700 }}>
        {form.empleado_id ? "Editar Empleado" : "Nuevo Empleado"}
      </DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb:2, borderRadius:2 }}>{err}</Alert>}
        <Grid container spacing={2} sx={{ mt:0.5 }}>
          {[
            { label:"Nombre *",    key:"nombre",           xs:6 },
            { label:"Apellidos *", key:"apellidos",        xs:6 },
            { label:"Email",       key:"email",            xs:12, type:"email" },
            { label:"WhatsApp",    key:"telefono_whatsapp",xs:6 },
            { label:"Contraseña",  key:"contrasena",       xs:6, type:"password" },
            { label:"Usuario",     key:"username",         xs:6 },
            { label:"Sueldo MXN",  key:"sueldo_mensual",   xs:6, type:"number" },
          ].map(f => (
            <Grid item xs={f.xs} key={f.key}>
              <TextField
                fullWidth size="small" label={f.label} type={f.type||"text"}
                value={form[f.key] || ""}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.key === "contrasena" && form.empleado_id ? "Dejar vacío para no cambiar" : undefined}
                InputProps={{ sx:{ borderRadius:2 } }}
              />
            </Grid>
          ))}
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="Rol *" select value={form.rol_id}
              onChange={e => set("rol_id", e.target.value)} InputProps={{ sx:{ borderRadius:2 } }}>
              {roles.map(r => <MenuItem key={r.rol_id} value={r.rol_id}>{r.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          {form.empleado_id && (
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Estado" select value={form.activo ? 1 : 0}
                onChange={e => set("activo", e.target.value === 1 || e.target.value === "1")}
                InputProps={{ sx:{ borderRadius:2 } }}>
                <MenuItem value={1}>Activo</MenuItem>
                <MenuItem value={0}>Inactivo</MenuItem>
              </TextField>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius:2 }}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ borderRadius:2 }}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Métricas Dialog ───────────────────────────────────────────
function EmpleadoMetricasDialog({ id, open, onClose }) {
  const { data, loading } = useEmpleadoMetricas(open ? id : null);
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx:{ borderRadius:4 } }}>
      <DialogTitle sx={{ fontFamily:"'Syne',sans-serif" }}>📊 Métricas del Empleado</DialogTitle>
      <DialogContent>
        {loading ? <Skeleton height={200} /> : !data ? null : (
          <Box sx={{ display:"flex", flexDirection:"column", gap:2 }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:2, p:2, borderRadius:3, background:alpha("#023C81",0.05) }}>
              <Avatar sx={{ width:50, height:50, background:"linear-gradient(135deg,#023C81,#1254A8)", fontWeight:700 }}>
                {data.empleado?.nombre?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700 }}>
                  {data.empleado?.nombre} {data.empleado?.apellidos}
                </Typography>
                <Chip label={data.empleado?.rol} size="small"
                  sx={{ background:alpha(ROL_COLORS[data.empleado?.rol]||"#023C81",0.12),
                        color:ROL_COLORS[data.empleado?.rol]||"#023C81", fontWeight:700, fontSize:10, mt:0.3 }} />
              </Box>
            </Box>
            {[
              { label:"Entregas realizadas", value: data.pedidosRepartidos?.total ?? 0 },
              { label:"Monto entregado",     value: `$${Number(data.pedidosRepartidos?.monto||0).toLocaleString("es-MX",{maximumFractionDigits:0})}` },
              { label:"Total gastos registrados", value: `$${Number(data.gastos?.total||0).toLocaleString("es-MX",{maximumFractionDigits:0})}` },
              { label:"Sueldo mensual",      value: data.empleado?.sueldo_mensual ? `$${Number(data.empleado.sueldo_mensual).toLocaleString("es-MX")}` : "N/A" },
            ].map(s => (
              <Box key={s.label} sx={{ display:"flex", justifyContent:"space-between", py:1, borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                <Typography variant="body2" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#023C81" }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Vista principal ────────────────────────────────────────────
export default function EmpleadosView() {
  const { empleados, roles, loading, error, search, setSearch, create, update, remove } = useEmpleados();
  const [formOpen,      setFormOpen]      = useState(false);
  const [formInitial,   setFormInitial]   = useState(null);
  const [metricasId,    setMetricasId]    = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleEdit   = (row) => { setFormInitial(row); setFormOpen(true); };
  const handleCreate = ()    => { setFormInitial(null); setFormOpen(true); };
  const handleSave   = async (data) => {
    if (data.empleado_id) await update(data.empleado_id, data);
    else                  await create(data);
  };
  const handleDelete = async () => {
    if (deleteConfirm) await remove(deleteConfirm.empleado_id);
    setDeleteConfirm(null);
  };

  const columns = [
    {
      field: "nombre", headerName: "Empleado", flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display:"flex", gap:1.5 }}>
          <Avatar sx={{ width:32, height:32, fontSize:13, fontWeight:700, background:`linear-gradient(135deg,${ROL_COLORS[row.rol]||"#023C81"},${alpha(ROL_COLORS[row.rol]||"#023C81",0.7)})` }}>
            {row.nombre?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight:600, fontSize:12 }}>
              {row.nombre} {row.apellidos}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize:10 }}>
              {row.email || row.username || "—"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field:"rol", headerName:"Rol", width:130,
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ background:alpha(ROL_COLORS[value]||"#023C81",0.12), color:ROL_COLORS[value]||"#023C81", fontWeight:700, fontSize:10 }} />
      ),
    },
    { field:"sueldo_mensual", headerName:"Sueldo", width:120, align:"right", headerAlign:"right",
      renderCell: ({ value }) => value
        ? <Typography variant="body2" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#023C81" }}>${Number(value).toLocaleString("es-MX")}</Typography>
        : <Typography variant="caption" color="text.secondary">N/A</Typography>,
    },
    { field:"activo", headerName:"Estado", width:100, align:"center", headerAlign:"center",
      renderCell: ({ value }) => (
        <Chip label={value?"Activo":"Inactivo"} size="small"
          sx={{ background:alpha(value?"#18A558":"#E53935",0.12), color:value?"#18A558":"#E53935", fontWeight:700, fontSize:10 }} />
      ),
    },
    { field:"telefono_whatsapp", headerName:"WhatsApp", width:140,
      renderCell: ({ value }) => <Typography variant="caption" color="text.secondary">{value||"—"}</Typography>,
    },
    {
      field:"acciones", headerName:"Acciones", width:130, sortable:false,
      renderCell: ({ row }) => (
        <Box sx={{ display:"flex", gap:0.5 }}>
          <Tooltip title="Ver métricas">
            <IconButton size="small" onClick={() => setMetricasId(row.empleado_id)} sx={{ color:"#023C81" }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => handleEdit(row)} sx={{ color:"#FF9800" }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar (desactivar)">
            <IconButton size="small" onClick={() => setDeleteConfirm(row)} sx={{ color:"#E53935" }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display:"flex", flexDirection:"column", gap:2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ p:2 }}>
        <Box sx={{ display:"flex", gap:2, alignItems:"center", flexWrap:"wrap" }}>
          <TextField
            size="small" placeholder="Buscar empleado..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ minWidth:240, flexGrow:1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{color:"#4A5B72",fontSize:18}} /></InputAdornment>,
              sx: { borderRadius:2.5 },
            }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} sx={{ borderRadius:2.5, whiteSpace:"nowrap" }}>
            Nuevo Empleado
          </Button>
        </Box>
      </Card>

      <Card>
        <DataGrid
          rows={empleados}
          columns={columns}
          getRowId={r => r.empleado_id}
          loading={loading}
          disableRowSelectionOnClick
          autoHeight
          pageSizeOptions={[10,20,50]}
          initialState={{ pagination:{ paginationModel:{ pageSize:10 } } }}
          sx={{ "& .MuiDataGrid-cell":{ borderColor:"rgba(2,60,129,0.05)" } }}
        />
      </Card>

      {/* ── Formulario ───── */}
      <EmpleadoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={formInitial}
        roles={roles}
      />

      {/* ── Métricas ─────── */}
      <EmpleadoMetricasDialog
        id={metricasId}
        open={!!metricasId}
        onClose={() => setMetricasId(null)}
      />

      {/* ── Confirmar eliminar ─── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle sx={{ fontFamily:"'Syne',sans-serif" }}>¿Desactivar empleado?</DialogTitle>
        <DialogContent>
          <Typography>
            Se desactivará a <strong>{deleteConfirm?.nombre} {deleteConfirm?.apellidos}</strong>. No se eliminará de la base de datos.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb:2, px:3 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" sx={{ borderRadius:2 }}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius:2 }}>Desactivar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}