// src/views/Repartidor/RutaRepartidorView.jsx
import { useState } from "react";
import {
  Box, Typography, Paper, Skeleton, Chip, Alert, Divider,
  alpha, Button, Tooltip, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, InputAdornment, CircularProgress,
} from "@mui/material";
import TwoWheelerIcon    from "@mui/icons-material/TwoWheeler";
import LocationOnIcon    from "@mui/icons-material/LocationOnRounded";
import CheckCircleIcon   from "@mui/icons-material/CheckCircleRounded";
import AccessTimeIcon    from "@mui/icons-material/AccessTimeRounded";
import PersonIcon        from "@mui/icons-material/PersonRounded";
import RefreshIcon       from "@mui/icons-material/RefreshRounded";
import QrCodeIcon        from "@mui/icons-material/QrCodeRounded";
import WhatsAppIcon      from "@mui/icons-material/WhatsApp";
import TagIcon           from "@mui/icons-material/Tag";
import { useMisPedidos } from "../../controllers/useRepartidor";
import { useNavigate }   from "react-router-dom";
import { repartidorService } from "../../services/repartidorService";

const ESTADO_CFG = {
  listo:     { label: "Listo para recoger", color: "#FED817",  bg: alpha("#FED817", 0.1)  },
  en_camino: { label: "En camino",           color: "#023C81",  bg: alpha("#023C81", 0.1)  },
  completado:{ label: "Completado",           color: "#18A558",  bg: alpha("#18A558", 0.1)  },
  entregado: { label: "Entregado",            color: "#18A558",  bg: alpha("#18A558", 0.1)  },
};

function PedidoCard({ p, onLlegue, onConfirmarClick }) {
  const est  = ESTADO_CFG[p.estado_pedido] || { label: p.estado_pedido, color: "#4A5B72", bg: alpha("#4A5B72", 0.1) };
  const hora = new Date(p.fecha_pedido).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, borderRadius: 3.5,
        border: `1.5px solid ${est.color}30`,
        background: `linear-gradient(135deg, ${est.color}08, ${est.color}03)`,
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: `0 4px 20px ${est.color}25` },
      }}
    >
      {/* Folio + Estado */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 15, color: "#0D1B2E" }}>
          📦 {p.folio}
        </Typography>
        <Chip
          label={est.label}
          size="small"
          sx={{
            background: est.bg,
            color: est.color,
            fontWeight: 700, fontSize: 11,
            fontFamily: "sans-serif",
          }}
        />
      </Box>

      <Divider sx={{ mb: 1.5, borderColor: `${est.color}20` }} />

      {/* Datos del pedido */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <PersonIcon sx={{ color: "#4A5B72", fontSize: 16, mt: 0.2 }} />
          <Typography sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#0D1B2E", fontWeight: 600 }}>
            {p.cliente}
          </Typography>
        </Box>

        {p.direccion_texto && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <LocationOnIcon sx={{ color: "#E53935", fontSize: 16, mt: 0.2, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#4A5B72" }}>
              {p.direccion_texto}
            </Typography>
          </Box>
        )}

        {p.productos && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography sx={{ fontSize: 14, flexShrink: 0 }}>🥟</Typography>
            <Typography sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#4A5B72" }}>
              {p.productos}
            </Typography>
          </Box>
        )}

        {/* Whatsapp del cliente - solo si está en camino */}
        {p.estado_pedido === "en_camino" && p.whatsapp && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WhatsAppIcon sx={{ color: "#25D366", fontSize: 16 }} />
            <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#25D366", fontWeight: 600 }}>
              {p.whatsapp}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ color: "#4A5B72", fontSize: 14 }} />
            <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72" }}>
              {hora}
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 16, color: "#023C81" }}>
            ${Number(p.total).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Acciones */}
      {p.estado_pedido === "listo" && (
        <Button
          fullWidth variant="contained" size="small"
          startIcon={<LocationOnIcon />}
          onClick={() => onLlegue(p.pedido_id)}
          sx={{
            mt: 1.5, borderRadius: 2.5,
            background: "linear-gradient(135deg, #023C81, #0356B8)",
            color: "#fff",
            fontFamily: "sans-serif", fontWeight: 700, fontSize: 12,
          }}
        >
          Ya llegué al domicilio
        </Button>
      )}

      {p.estado_pedido === "en_camino" && (
        <Button
          fullWidth variant="outlined" size="small"
          startIcon={<CheckCircleIcon />}
          onClick={() => onConfirmarClick(p)}
          sx={{
            mt: 1.5, borderRadius: 2.5,
            borderColor: "#18A558", color: "#18A558",
            fontFamily: "sans-serif", fontWeight: 700, fontSize: 12,
            "&:hover": { background: alpha("#18A558", 0.06), borderColor: "#0D7A3E" },
          }}
        >
          Confirmar entrega
        </Button>
      )}
    </Paper>
  );
}

export default function RutaRepartidorView() {
  const { pedidos, loading, error, lastSync, reload } = useMisPedidos();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [codigoConfirm, setCodigoConfirm] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const hh = lastSync
    ? lastSync.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  const activos   = pedidos.filter((p) => ["listo", "en_camino"].includes(p.estado_pedido));
  const completados = pedidos.filter((p) => ["completado", "entregado"].includes(p.estado_pedido));

  const handleLlegue = async (pedidoId) => {
    // Por ahora, simplemente cambiar el estado a en_camino en el frontend
    // O si necesitas hacerlo en backend, llamar a un endpoint
    const pedido = pedidos.find(p => p.pedido_id === pedidoId);
    if (pedido && pedido.estado_pedido === "listo") {
      // Aquí iría la lógica para marcar como "llegué"
      // Por ahora lo saltamos y vamos directamente a confirmar
      const updated = { ...pedido, estado_pedido: "en_camino" };
      setSelectedPedido(updated);
      setDialogOpen(true);
    }
  };

  const handleConfirmarClick = (pedido) => {
    setSelectedPedido(pedido);
    setCodigoConfirm("");
    setConfirmError("");
    setConfirmSuccess(false);
    setDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!codigoConfirm.trim()) {
      setConfirmError("Ingresa el código de entrega.");
      return;
    }
    
    setConfirmLoading(true);
    setConfirmError("");
    
    try {
      await repartidorService.confirmarEntrega(codigoConfirm);
      setConfirmSuccess(true);
      setCodigoConfirm("");
      
      setTimeout(() => {
        setDialogOpen(false);
        reload();
      }, 1500);
    } catch (e) {
      setConfirmError(e.response?.data?.error || "Error al confirmar la entrega.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!confirmLoading) {
      setDialogOpen(false);
      setSelectedPedido(null);
      setCodigoConfirm("");
      setConfirmError("");
      setConfirmSuccess(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: "linear-gradient(135deg, #023C81, #0356B8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(2,60,129,0.3)",
            }}
          >
            <TwoWheelerIcon sx={{ color: "#FED817", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color: "#0D1B2E", lineHeight: 1.2 }}>
              Mis Entregas
            </Typography>
            <Typography variant="caption" sx={{ color: "#4A5B72" }}>
              Actualizado {hh}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Escanear nuevo pedido">
            <Chip
              icon={<QrCodeIcon />}
              label="Escanear"
              onClick={() => navigate("/repartidor/escanear")}
              clickable
              sx={{
                background: "linear-gradient(135deg, #023C81, #0356B8)",
                color: "#FED817", fontWeight: 700,
                "& .MuiChip-icon": { color: "#FED817" },
              }}
            />
          </Tooltip>
          <Tooltip title="Actualizar">
            <Chip
              icon={<RefreshIcon />}
              onClick={reload}
              clickable
              sx={{ background: alpha("#023C81", 0.08), color: "#023C81" }}
            />
          </Tooltip>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      )}

      {/* Stats rápidas */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {[
          { label: "Activos",      value: activos.length,   color: "#023C81" },
          { label: "Completados",  value: completados.length, color: "#18A558" },
        ].map((m) => (
          <Box
            key={m.label}
            sx={{
              flex: 1, p: 1.8, borderRadius: 3, textAlign: "center",
              background: alpha(m.color, 0.07),
              border: `1.5px solid ${alpha(m.color, 0.18)}`,
            }}
          >
            <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 26, color: m.color, lineHeight: 1 }}>
              {loading ? "—" : m.value}
            </Typography>
            <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 11 }}>
              {m.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Lista de pedidos activos */}
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={170} sx={{ borderRadius: 3.5 }} />)}
        </Box>
      ) : activos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4, borderRadius: 3.5, textAlign: "center",
            border: "1.5px dashed rgba(2,60,129,0.18)",
            background: alpha("#023C81", 0.02),
          }}
        >
          <TwoWheelerIcon sx={{ fontSize: 56, color: alpha("#023C81", 0.2), mb: 1 }} />
          <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#4A5B72", mb: 0.5 }}>
            Sin entregas activas
          </Typography>
          <Typography sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#4A5B72" }}>
            Escanea un QR para asignarte un pedido
          </Typography>
          <Button
            variant="contained" size="small"
            onClick={() => navigate("/repartidor/escanear")}
            sx={{
              mt: 2, background: "linear-gradient(135deg, #023C81, #0356B8)",
              color: "#fff", borderRadius: 2.5, fontFamily: "sans-serif", fontWeight: 700,
              boxShadow: "0 4px 12px rgba(2,60,129,0.3)",
            }}
          >
            📷 Escanear QR
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {activos.map((p) => (
            <PedidoCard
              key={p.pedido_id}
              p={p}
              onLlegue={handleLlegue}
              onConfirmarClick={handleConfirmarClick}
            />
          ))}
        </Box>
      )}

      {/* Completados del día (colapsados) */}
      {completados.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <CheckCircleIcon sx={{ color: "#18A558", fontSize: 18 }} />
            <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558", fontSize: 14 }}>
              Completados hoy ({completados.length})
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {completados.map((p) => (
              <Paper
                key={p.pedido_id}
                elevation={0}
                sx={{
                  px: 2.5, py: 1.5, borderRadius: 3,
                  border: "1px solid rgba(24,165,88,0.15)",
                  background: alpha("#18A558", 0.03),
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, color: "#0D1B2E" }}>
                    {p.folio}
                  </Typography>
                  <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72" }}>
                    {p.cliente}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558", fontSize: 14 }}>
                    ${Number(p.total).toFixed(2)}
                  </Typography>
                  <CheckCircleIcon sx={{ color: "#18A558", fontSize: 18 }} />
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}

      {/* DIALOG DE CONFIRMACIÓN */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 16, color: "#0D1B2E" }}>
          Confirmar Entrega
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {selectedPedido && (
            <>
              {/* Datos del pedido */}
              <Box>
                <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, color: "#4A5B72", mb: 1 }}>
                  Información del Pedido
                </Typography>
                <Paper elevation={0} sx={{ p: 1.5, background: alpha("#023C81", 0.04), borderRadius: 2 }}>
                  <Typography sx={{ fontFamily: "sans-serif", fontWeight: 600, fontSize: 14, color: "#0D1B2E" }}>
                    📦 {selectedPedido.folio}
                  </Typography>
                  <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72", mt: 0.5 }}>
                    {selectedPedido.productos}
                  </Typography>
                  <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#4A5B72", mt: 0.5 }}>
                    Total: <strong>${Number(selectedPedido.total).toFixed(2)}</strong>
                  </Typography>
                </Paper>
              </Box>

              {/* Datos del cliente */}
              <Box>
                <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, color: "#4A5B72", mb: 1 }}>
                  Cliente
                </Typography>
                <Paper elevation={0} sx={{ p: 1.5, background: alpha("#25D366", 0.04), borderRadius: 2 }}>
                  <Typography sx={{ fontFamily: "sans-serif", fontWeight: 600, fontSize: 13, color: "#0D1B2E" }}>
                    👤 {selectedPedido.cliente}
                  </Typography>
                  {selectedPedido.whatsapp && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.8 }}>
                      <WhatsAppIcon sx={{ color: "#25D366", fontSize: 16 }} />
                      <Typography sx={{ fontFamily: "sans-serif", fontSize: 12, color: "#25D366", fontWeight: 600 }}>
                        {selectedPedido.whatsapp}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>

              {/* Código de confirmación */}
              <TextField
                fullWidth
                label="Código de Entrega"
                placeholder="Ej: 142"
                value={codigoConfirm}
                onChange={(e) => {
                  setCodigoConfirm(e.target.value);
                  setConfirmError("");
                }}
                disabled={confirmLoading || confirmSuccess}
                type="text"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TagIcon sx={{ color: "#023C81", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#023C81", borderWidth: 2,
                    },
                  },
                }}
              />

              {/* Error message */}
              {confirmError && (
                <Alert severity="error" onClose={() => setConfirmError("")}>
                  {confirmError}
                </Alert>
              )}

              {/* Success message */}
              {confirmSuccess && (
                <Alert severity="success">
                  ✅ Entrega confirmada correctamente
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDialogClose} disabled={confirmLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSubmit}
            disabled={confirmLoading || confirmSuccess || !codigoConfirm.trim()}
            startIcon={confirmLoading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <CheckCircleIcon />}
            sx={{
              background: "linear-gradient(135deg, #18A558, #0D7A3E)",
              color: "#fff",
              fontFamily: "sans-serif",
              fontWeight: 700,
            }}
          >
            {confirmLoading ? "Confirmando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}