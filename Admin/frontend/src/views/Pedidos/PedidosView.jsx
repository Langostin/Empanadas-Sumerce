// src/views/Pedidos/PedidosView.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Box, Card, TextField, InputAdornment, Chip, Typography,
  MenuItem, Alert, alpha, Grid,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/SearchRounded";
import { pedidosService } from "../../services/api";
import { ESTADO_PEDIDO_COLORS, ESTADO_PAGO_COLORS } from "../../models";

const ESTADOS = ["", "recibido", "en_cocina", "listo", "en_camino", "entregado", "cancelado"];
const TIPOS   = ["", "individual", "evento"];

function usePedidos() {
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [estado,   setEstado]   = useState("");
  const [tipo,     setTipo]     = useState("");
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pedidosService.getAll({ estado, tipo, page: page + 1, limit: PAGE_SIZE });
      setPedidos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [estado, tipo, page]);

  useEffect(() => { load(); }, [load]);

  return { pedidos, loading, error, estado, setEstado, tipo, setTipo, page, setPage, PAGE_SIZE, reload: load };
}

// ── Resumen de conteos por estado ─────────────────────────────
function EstadoSummaryBar({ pedidos }) {
  const counts = {};
  pedidos.forEach(p => { counts[p.estado_pedido] = (counts[p.estado_pedido] || 0) + 1; });

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {Object.entries(counts).map(([estado, n]) => (
        <Chip
          key={estado}
          label={`${estado.replace("_", " ")}: ${n}`}
          size="small"
          sx={{
            background: alpha(ESTADO_PEDIDO_COLORS[estado] || "#ccc", 0.15),
            color:      ESTADO_PEDIDO_COLORS[estado] || "#666",
            fontWeight: 700,
            fontSize:   11,
            fontFamily: "'Syne',sans-serif",
          }}
        />
      ))}
    </Box>
  );
}

export default function PedidosView() {
  const {
    pedidos, loading, error,
    estado, setEstado,
    tipo,   setTipo,
    page, setPage, PAGE_SIZE,
  } = usePedidos();

  const columns = [
    {
      field: "folio", headerName: "Folio", width: 130,
      renderCell: ({ value }) => (
        <Typography
          variant="caption"
          sx={{ fontFamily: "sans-serif", fontWeight: 600, color: "#023C81", fontSize: 13 }}
        >
          {value}
        </Typography>
      ),
    },
    {
      field: "cliente", headerName: "Cliente", flex: 1.2, minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", justifyContent: "center", flexDirection: "column", gap: 0.2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>
            {row.cliente}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            {row.whatsapp}
          </Typography>
        </Box>
      ),
    },
    {
      field: "tipo_pedido", headerName: "Tipo", width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          sx={{
            background: value === "evento"
              ? alpha("#FED817", 0.18)
              : alpha("#023C81", 0.08),
            color:      value === "evento" ? "#C9AC0E" : "#023C81",
            fontWeight: 700, fontSize: 10,
          }}
        />
      ),
    },
    {
      field: "tipo_entrega", headerName: "Entrega", width: 110,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#4A5B72" }}>
          {value === "domicilio" ? "Domicilio" : "Tienda"}
        </Typography>
      ),
    },
    {
      field: "estado_pedido", headerName: "Estado", width: 130,
      renderCell: ({ value }) => (
        <Chip
          label={value?.replace("_", " ")}
          size="small"
          sx={{
            background: alpha(ESTADO_PEDIDO_COLORS[value] || "#ccc", 0.15),
            color:      ESTADO_PEDIDO_COLORS[value] || "#666",
            fontWeight: 700, fontSize: 10,
          }}
        />
      ),
    },
    {
      field: "estado_pago", headerName: "Pago", width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          sx={{
            background: alpha(ESTADO_PAGO_COLORS[value] || "#ccc", 0.12),
            color:      ESTADO_PAGO_COLORS[value] || "#666",
            fontWeight: 700, fontSize: 10,
          }}
        />
      ),
    },
    {
      field: "metodo_pago", headerName: "Método pago", width: 130,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ color: "#4A5B72", fontWeight: 500 }}>
          {value || "—"}
        </Typography>
      ),
    },
    {
      field: "total", headerName: "Total", width: 110, align: "right", headerAlign: "right",
      renderCell: ({ value }) => (
        <Typography
          variant="caption"
          sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#023C81" }}
        >
          ${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      field: "fecha_pedido", headerName: "Fecha", width: 155,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ color: "#4A5B72" }}>
          {value ? new Date(value).toLocaleString("es-MX", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          }) : "—"}
        </Typography>
      ),
    },
    {
      field: "canal", headerName: "Canal", width: 100,
      renderCell: ({ value }) => {
        const icon = { whatsapp: "📱", llamada: "📞", web: "🌐", presencial: "🏪" }[value] || "❓";
        return <Typography variant="caption" sx={{ fontWeight: 600 }}>{icon} {value}</Typography>;
      },
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* ── Filtros ─────────────────────────────── */}
      <Card sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" select
              label="Estado del pedido"
              value={estado}
              onChange={e => { setEstado(e.target.value); setPage(0); }}
              InputProps={{ sx: { borderRadius: 2.5 } }}
            >
              {ESTADOS.map(e => (
                <MenuItem key={e} value={e}>
                  {e ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_PEDIDO_COLORS[e] || "#ccc" }} />
                      {e.replace("_", " ")}
                    </Box>
                  ) : "Todos los estados"}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" select
              label="Tipo de pedido"
              value={tipo}
              onChange={e => { setTipo(e.target.value); setPage(0); }}
              InputProps={{ sx: { borderRadius: 2.5 } }}
            >
              {TIPOS.map(t => (
                <MenuItem key={t} value={t}>{t || "Todos los tipos"}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={5}>
            <EstadoSummaryBar pedidos={pedidos} />
          </Grid>
        </Grid>
      </Card>

      {/* ── Tabla ───────────────────────────────── */}
      <Card>
        <DataGrid
          rows={pedidos}
          columns={columns}
          getRowId={r => r.pedido_id}
          loading={loading}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={m => setPage(m.page)}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            "& .MuiDataGrid-cell": { borderColor: "rgba(2,60,129,0.05)" },
            "& .MuiDataGrid-row:hover": { background: alpha("#023C81", 0.03) },
          }}
        />
      </Card>
    </Box>
  );
}