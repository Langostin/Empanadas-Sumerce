// src/views/Clientes/ClientesView.jsx
import { useState } from "react";
import {
  Box, Card, TextField, InputAdornment, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, Typography, Avatar, Grid,
  Switch, FormControlLabel, Divider, Alert, Skeleton, alpha,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon     from "@mui/icons-material/SearchRounded";
import InfoIcon       from "@mui/icons-material/InfoRounded";
import BlockIcon      from "@mui/icons-material/BlockRounded";
import CheckIcon      from "@mui/icons-material/CheckCircleRounded";
import VolumeOffIcon  from "@mui/icons-material/VolumeOffRounded";
import SmartToyIcon   from "@mui/icons-material/SmartToyRounded";
import { useClientes, useClienteMetricas } from "../../controllers/useClientes";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { ESTADO_PEDIDO_COLORS } from "../../models";

// ── Drawer de métricas del cliente ────────────────────────────
function ClienteMetricasDialog({ whatsapp, open, onClose }) {
  const { data, loading } = useClienteMetricas(open ? whatsapp : null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Syne',sans-serif", pb: 1 }}>
        📊 Métricas del Cliente
      </DialogTitle>
      <DialogContent>
        {loading ? <Skeleton height={200} /> : !data ? null : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: 3, background: alpha("#023C81", 0.05) }}>
              <Avatar sx={{ width: 52, height: 52, background: "linear-gradient(135deg,#023C81,#1254A8)", fontSize: 22, fontWeight: 700 }}>
                {(data.cliente?.nombre || "?")?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>
                  {data.cliente?.nombre || "Sin nombre"} {data.cliente?.apellidos || ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">{whatsapp}</Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              {[
                { label: "Total pedidos",  value: data.cliente?.total_pedidos ?? 0 },
                { label: "Total gastado",  value: `$${Number(data.cliente?.total_gastado||0).toLocaleString("es-MX",{maximumFractionDigits:0})}` },
              ].map(s => (
                <Grid item xs={6} key={s.label}>
                  <Box sx={{ p: 2, borderRadius: 2.5, background: alpha("#023C81", 0.05), textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {data.pedidosPorEstado?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>
                  Pedidos por estado
                </Typography>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={data.pedidosPorEstado} dataKey="total" nameKey="estado_pedido" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {data.pedidosPorEstado.map(e => (
                        <Cell key={e.estado_pedido} fill={ESTADO_PEDIDO_COLORS[e.estado_pedido] || "#ccc"} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}

            {data.ultimosPedidos?.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>
                  Últimos pedidos
                </Typography>
                {data.ultimosPedidos.map(p => (
                  <Box key={p.pedido_id} sx={{ display:"flex", justifyContent:"space-between", py:0.8, borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.folio}</Typography>
                    <Chip label={p.estado_pedido} size="small"
                      sx={{ background: alpha(ESTADO_PEDIDO_COLORS[p.estado_pedido]||"#ccc",0.15),
                            color: ESTADO_PEDIDO_COLORS[p.estado_pedido], fontWeight: 700, fontSize: 10, height: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#023C81" }}>
                      ${Number(p.total).toLocaleString("es-MX")}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Vista principal ────────────────────────────────────────────
export default function ClientesView() {
  const {
    clientes, total, loading, error,
    search, setSearch,
    page, setPage, PAGE_SIZE,
    toggleActivo, toggleBloqueoSordo, toggleBloqueoIA,
  } = useClientes();

  const [selected, setSelected] = useState(null);

  const columns = [
    {
      field: "nombre_completo", headerName: "Cliente", flex: 1.5, minWidth: 180,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#023C81,#1254A8)" }}>
            {(row.nombre || row.whatsapp)?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>
              {row.nombre_completo || "Sin nombre"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {row.whatsapp}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: "total_pedidos", headerName: "Pedidos", width: 90, align: "center", headerAlign: "center",
      renderCell: ({ value }) => (
        <Chip label={value} size="small" sx={{ background: alpha("#023C81",0.1), color:"#023C81", fontWeight:700, fontSize:11 }} />
      ),
    },
    { field: "total_gastado", headerName: "Gastado", width: 120, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#023C81" }}>
          ${Number(value||0).toLocaleString("es-MX",{maximumFractionDigits:0})}
        </Typography>
      ),
    },
    {
      field: "activo", headerName: "Estado", width: 100, align: "center", headerAlign: "center",
      renderCell: ({ row }) => (
        <Chip
          label={row.activo ? "Activo" : "Bloqueado"}
          size="small"
          sx={{
            background: row.activo ? alpha("#18A558",0.12) : alpha("#E53935",0.12),
            color: row.activo ? "#18A558" : "#E53935",
            fontWeight: 700, fontSize: 10,
          }}
        />
      ),
    },
    {
      field: "bloqueo_sordo", headerName: "Bloqueos", width: 160, align: "center", headerAlign: "center",
      renderCell: ({ row }) => (
        <Box sx={{ display:"flex", gap:0.5 }}>
          {row.bloqueo_sordo && (
            <Tooltip title="Bloqueo sordo: sin audio">
              <Chip icon={<VolumeOffIcon sx={{fontSize:"14px !important"}} />} label="Sordo" size="small"
                sx={{ background: alpha("#FF9800",0.12), color:"#FF9800", fontWeight:700, fontSize:10, "& .MuiChip-icon":{color:"#FF9800"} }} />
            </Tooltip>
          )}
          {row.bloqueo_ia && (
            <Tooltip title="Bloqueo IA: sin Gemini">
              <Chip icon={<SmartToyIcon sx={{fontSize:"14px !important"}} />} label="Sin IA" size="small"
                sx={{ background: alpha("#9C27B0",0.12), color:"#9C27B0", fontWeight:700, fontSize:10, "& .MuiChip-icon":{color:"#9C27B0"} }} />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "acciones", headerName: "Acciones", width: 150, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display:"flex", gap:0.5 }}>
          <Tooltip title="Ver métricas">
            <IconButton size="small" onClick={() => setSelected(row)} sx={{ color:"#023C81" }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.activo ? "Bloquear cliente" : "Activar cliente"}>
            <IconButton size="small" onClick={() => toggleActivo(row.whatsapp, !row.activo)}
              sx={{ color: row.activo ? "#E53935" : "#18A558" }}>
              {row.activo ? <BlockIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={row.bloqueo_sordo ? "Quitar bloqueo sordo" : "Bloqueo sordo (sin audio)"}>
            <IconButton size="small" onClick={() => toggleBloqueoSordo(row.whatsapp, !row.bloqueo_sordo)}
              sx={{ color: row.bloqueo_sordo ? "#FF9800" : "#4A5B72" }}>
              <VolumeOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.bloqueo_ia ? "Quitar bloqueo IA" : "Bloqueo IA (sin Gemini)"}>
            <IconButton size="small" onClick={() => toggleBloqueoIA(row.whatsapp, !row.bloqueo_ia)}
              sx={{ color: row.bloqueo_ia ? "#9C27B0" : "#4A5B72" }}>
              <SmartToyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display:"flex", flexDirection:"column", gap:2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* ── Buscador ───────────────────────── */}
      <Card sx={{ p:2 }}>
        <Box sx={{ display:"flex", gap:2, alignItems:"center", flexWrap:"wrap" }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre o WhatsApp..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            sx={{ minWidth: 280, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{color:"#4A5B72",fontSize:18}} /></InputAdornment>,
              sx: { borderRadius: 2.5 },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {total} clientes registrados
          </Typography>
        </Box>
      </Card>

      {/* ── Leyenda de bloqueos ────────────── */}
      <Box sx={{ display:"flex", gap:1.5, flexWrap:"wrap" }}>
        {[
          { label:"Bloqueo sordo: no recibe audios, solo texto", color:"#FF9800" },
          { label:"Bloqueo IA: bot responde sin Gemini",          color:"#9C27B0" },
          { label:"Cliente bloqueado: sin acceso al bot",         color:"#E53935" },
        ].map(i => (
          <Box key={i.label} sx={{ display:"flex", alignItems:"center", gap:0.7 }}>
            <Box sx={{ width:8, height:8, borderRadius:"50%", background:i.color }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize:11 }}>{i.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── DataGrid ──────────────────────── */}
      <Card>
        <DataGrid
          rows={clientes}
          columns={columns}
          getRowId={r => r.whatsapp}
          loading={loading}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={m => setPage(m.page)}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            "& .MuiDataGrid-row": { cursor:"default" },
            "& .MuiDataGrid-cell": { borderColor:"rgba(2,60,129,0.05)" },
          }}
        />
      </Card>

      {/* ── Métricas Dialog ───────────────── */}
      <ClienteMetricasDialog
        whatsapp={selected?.whatsapp}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </Box>
  );
}