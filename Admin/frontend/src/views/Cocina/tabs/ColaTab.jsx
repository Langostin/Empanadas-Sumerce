// src/views/Cocina/tabs/ColaTab.jsx
import { useState } from "react";
import {
  Box, Grid, Card, CardContent, CardActions, Typography, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Divider, CircularProgress, Skeleton, Alert, Tooltip, alpha,
} from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import CheckCircleIcon         from "@mui/icons-material/CheckCircleRounded";
import CancelIcon              from "@mui/icons-material/CancelRounded";
import AccessTimeIcon          from "@mui/icons-material/AccessTimeRounded";
import DeliveryDiningIcon      from "@mui/icons-material/DeliveryDiningRounded";
import StorefrontIcon          from "@mui/icons-material/StorefrontRounded";
import InfoOutlinedIcon        from "@mui/icons-material/InfoOutlined";
import RestaurantIcon          from "@mui/icons-material/RestaurantRounded";
import { useAccionPedido }     from "../../../controllers/useCocina";
import DetallePedidoDialog     from "../components/DetallePedidoDialog";

// ── Helpers ────────────────────────────────────────────────────
const tiempoColor = (min) => {
  if (min <= 10) return "#18A558";
  if (min <= 20) return "#FF9800";
  return "#E53935";
};

const tiempoLabel = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};

// ── Chip de estado de cocina ───────────────────────────────────
const ESTADO_CONFIG = {
  pendiente:  { label: "Pendiente",   color: "#FF9800", bg: alpha("#FF9800", 0.1) },
  en_proceso: { label: "En proceso",  color: "#023C81", bg: alpha("#023C81", 0.1) },
  terminado:  { label: "Listo",       color: "#18A558", bg: alpha("#18A558", 0.1) },
};

// ── Confirmación de cancelar ───────────────────────────────────
function CancelarDialog({ open, onClose, onConfirm, folio, procesando }) {
  const [obs, setObs] = useState("");
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#E53935" }}>
        ¿Cancelar pedido {folio}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Esta acción marcará el pedido como cancelado y notificará al sistema.
        </Typography>
        <TextField
          fullWidth size="small" multiline rows={2}
          label="Motivo de cancelación (opcional)"
          value={obs} onChange={(e) => setObs(e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Volver
        </Button>
        <Button
          onClick={() => { onConfirm(obs); setObs(""); }}
          variant="contained" color="error"
          disabled={procesando}
          sx={{ borderRadius: 2, fontFamily: "sans-serif", fontWeight: 700 }}
        >
          {procesando ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Cancelar pedido"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Tarjeta de pedido ──────────────────────────────────────────
function PedidoCard({ pedido, onAccion, procesando }) {
  const [cancelarOpen,  setCancelarOpen]  = useState(false);
  const [detalleOpen,   setDetalleOpen]   = useState(false);
  const cfg = ESTADO_CONFIG[pedido.estado_cocina] || ESTADO_CONFIG.pendiente;
  const tc  = tiempoColor(pedido.minutos_en_cola);
  const esPendiente  = pedido.estado_pedido === "recibido";
  const esEnProceso  = pedido.estado_pedido === "en_cocina";

  // Borde lateral de urgencia
  const borderColor = pedido.minutos_en_cola > 20
    ? "#E53935"
    : pedido.minutos_en_cola > 10
    ? "#FF9800"
    : "#023C81";

  return (
    <>
      <Card
        sx={{
          borderRadius: 3,
          border: `1.5px solid ${alpha(borderColor, 0.25)}`,
          borderLeft: `4px solid ${borderColor}`,
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: `0 4px 20px ${alpha(borderColor, 0.15)}` },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          {/* Cabecera: folio + estado + tiempo */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81", fontSize: 13 }}
              >
                {pedido.folio}
              </Typography>
              <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                {new Date(pedido.fecha_pedido).toLocaleTimeString("es-MX", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4 }}>
              <Chip
                label={cfg.label}
                size="small"
                sx={{ background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 20 }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <AccessTimeIcon sx={{ fontSize: 11, color: tc }} />
                <Typography variant="caption" sx={{ color: tc, fontSize: 10, fontWeight: 700 }}>
                  {tiempoLabel(pedido.minutos_en_cola)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Tipo de entrega */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            {pedido.tipo_entrega === "domicilio" ? (
              <DeliveryDiningIcon sx={{ fontSize: 14, color: "#023C81" }} />
            ) : (
              <StorefrontIcon sx={{ fontSize: 14, color: "#FF9800" }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10, color: "#4A5B72" }}>
              {pedido.tipo_entrega === "domicilio" ? "Domicilio" : "Recoger en tienda"}
            </Typography>
            {pedido.tipo_pedido === "evento" && (
              <Chip label="Evento" size="small"
                sx={{ ml: 0.5, height: 16, fontSize: 9, background: alpha("#7B1FA2", 0.1), color: "#7B1FA2", fontWeight: 700 }} />
            )}
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Productos */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <RestaurantIcon sx={{ fontSize: 12, color: "#8B4513" }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#8B4513", fontSize: 10 }}>
                {pedido.total_empanadas} empanada{pedido.total_empanadas > 1 ? "s" : ""}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontSize: 12,
                color: "#1a1a2e",
                lineHeight: 1.5,
                background: alpha("#023C81", 0.04),
                borderRadius: 1.5,
                px: 1,
                py: 0.5,
              }}
            >
              {pedido.productos}
            </Typography>
          </Box>

          {/* Dirección (solo domicilio) */}
          {pedido.tipo_entrega === "domicilio" && pedido.direccion_entrega && (
            <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10, display: "block" }}>
              📍 {pedido.direccion_entrega}
            </Typography>
          )}

          {/* Cocinero asignado */}
          {pedido.cocinero && (
            <Typography variant="caption" sx={{ color: "#023C81", fontSize: 10, display: "block", mt: 0.3 }}>
              👨‍🍳 {pedido.cocinero}
            </Typography>
          )}
        </CardContent>

        {/* Acciones */}
        <CardActions sx={{ px: 2, pb: 2, pt: 0, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {/* Botón de detalle siempre visible */}
          <Tooltip title="Ver detalle completo">
            <Button
              size="small" variant="outlined"
              onClick={() => setDetalleOpen(true)}
              sx={{
                borderRadius: 2, minWidth: 0, px: 1.2,
                borderColor: alpha("#023C81", 0.3),
                color: "#023C81",
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </Button>
          </Tooltip>

          {/* Aceptar (solo pendiente) */}
          {esPendiente && (
            <Button
              size="small" variant="contained"
              disabled={!!procesando}
              onClick={() => onAccion(pedido.pedido_id, "aceptar")}
              startIcon={
                procesando
                  ? <CircularProgress size={14} sx={{ color: "#fff" }} />
                  : <LocalFireDepartmentIcon />
              }
              sx={{
                flexGrow: 1,
                borderRadius: 2,
                background: "linear-gradient(135deg,#023C81,#1254A8)",
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {procesando ? "..." : "Aceptar"}
            </Button>
          )}

          {/* Marcar listo (solo en proceso) */}
          {esEnProceso && (
            <Button
              size="small" variant="contained" color="success"
              disabled={!!procesando}
              onClick={() => onAccion(pedido.pedido_id, "listo")}
              startIcon={
                procesando
                  ? <CircularProgress size={14} sx={{ color: "#fff" }} />
                  : <CheckCircleIcon />
              }
              sx={{
                flexGrow: 1,
                borderRadius: 2,
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {procesando ? "..." : "Listo"}
            </Button>
          )}

          {/* Cancelar */}
          {(esPendiente || esEnProceso) && (
            <Button
              size="small" variant="outlined" color="error"
              disabled={!!procesando}
              onClick={() => setCancelarOpen(true)}
              sx={{ borderRadius: 2, fontFamily: "sans-serif", fontWeight: 700, fontSize: 11 }}
            >
              <CancelIcon fontSize="small" />
            </Button>
          )}
        </CardActions>
      </Card>

      <CancelarDialog
        open={cancelarOpen}
        onClose={() => setCancelarOpen(false)}
        onConfirm={(obs) => { onAccion(pedido.pedido_id, "cancelar", obs); setCancelarOpen(false); }}
        folio={pedido.folio}
        procesando={!!procesando}
      />

      <DetallePedidoDialog
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        pedidoId={pedido.pedido_id}
      />
    </>
  );
}

// ── Vista principal de la cola ─────────────────────────────────
export default function ColaTab({ pedidos, loading, reload }) {
  const { ejecutar, procesando, error, setError } = useAccionPedido(reload);

  const pendientes = pedidos.filter((p) => p.estado_pedido === "recibido");
  const enProceso  = pedidos.filter((p) => p.estado_pedido === "en_cocina");

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!pedidos.length) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: "center",
          background: alpha("#023C81", 0.03),
          borderRadius: 4,
          border: `1.5px dashed ${alpha("#023C81", 0.15)}`,
        }}
      >
        <RestaurantIcon sx={{ fontSize: 48, color: alpha("#023C81", 0.25), mb: 1 }} />
        <Typography variant="h6" sx={{ color: alpha("#023C81", 0.4), fontFamily: "sans-serif", fontWeight: 700 }}>
          Sin pedidos activos
        </Typography>
        <Typography variant="caption" sx={{ color: "#4A5B72" }}>
          La cola está vacía. Los nuevos pedidos aparecerán automáticamente.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      )}

      {/* Sección PENDIENTES */}
      {pendientes.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#FF9800" }} />
            <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#FF9800" }}>
              Pendientes ({pendientes.length})
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {pendientes.map((p) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={p.pedido_id}>
                <PedidoCard
                  pedido={p}
                  onAccion={ejecutar}
                  procesando={procesando[p.pedido_id]}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Sección EN PROCESO */}
      {enProceso.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#023C81",
              animation: "pulse 1.5s infinite",
              "@keyframes pulse": {
                "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 }
              }
            }} />
            <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81" }}>
              En proceso ({enProceso.length})
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {enProceso.map((p) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={p.pedido_id}>
                <PedidoCard
                  pedido={p}
                  onAccion={ejecutar}
                  procesando={procesando[p.pedido_id]}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}