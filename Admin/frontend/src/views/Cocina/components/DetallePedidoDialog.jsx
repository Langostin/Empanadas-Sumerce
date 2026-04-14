// src/views/Cocina/components/DetallePedidoDialog.jsx
import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent,
  Box, Typography, Chip, Divider, Skeleton, alpha,
  Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import RestaurantIcon    from "@mui/icons-material/RestaurantRounded";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDiningRounded";
import StorefrontIcon    from "@mui/icons-material/StorefrontRounded";
import { cocinaService } from "../../../services/cocinaService";

export default function DetallePedidoDialog({ open, onClose, pedidoId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    cocinaService
      .getPedidoDetalle(pedidoId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle
        sx={{ fontFamily: "sans-serif", fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}
      >
        <RestaurantIcon sx={{ color: "#023C81" }} />
        Detalle del pedido
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Skeleton height={40} sx={{ borderRadius: 2 }} />
            <Skeleton height={120} sx={{ borderRadius: 2 }} />
            <Skeleton height={60} sx={{ borderRadius: 2 }} />
          </Box>
        ) : !data ? (
          <Typography color="text.secondary">No se pudo cargar el pedido.</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Cabecera */}
            <Box
              sx={{
                p: 2, borderRadius: 3,
                background: alpha("#023C81", 0.05),
                border: `1px solid ${alpha("#023C81", 0.12)}`,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81", fontSize: 18 }}>
                    {data.pedido?.folio}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#4A5B72" }}>
                    {new Date(data.pedido?.fecha_pedido).toLocaleString("es-MX", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                  <Chip
                    label={data.pedido?.estado_pedido}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: 10, textTransform: "capitalize" }}
                    color={
                      data.pedido?.estado_pedido === "cancelado" ? "error" :
                      data.pedido?.estado_pedido === "entregado" ? "success" : "primary"
                    }
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {data.pedido?.tipo_entrega === "domicilio"
                      ? <DeliveryDiningIcon sx={{ fontSize: 14, color: "#023C81" }} />
                      : <StorefrontIcon    sx={{ fontSize: 14, color: "#FF9800" }} />}
                    <Typography variant="caption" sx={{ fontSize: 10, color: "#4A5B72" }}>
                      {data.pedido?.tipo_entrega === "domicilio" ? "Domicilio" : "Recoger en tienda"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Cliente */}
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ color: "#4A5B72", display: "block" }}>
                👤 <strong>Cliente:</strong> {data.pedido?.cliente}
              </Typography>
              {data.pedido?.tipo_entrega === "domicilio" && data.pedido?.calle && (
                <Typography variant="caption" sx={{ color: "#4A5B72", display: "block" }}>
                  📍 {data.pedido.calle}{data.pedido.numero_exterior ? ` ${data.pedido.numero_exterior}` : ""},
                  {" "}{data.pedido.colonia}, {data.pedido.ciudad}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "#4A5B72", display: "block" }}>
                💳 <strong>Pago:</strong> {data.pedido?.metodo_pago}
              </Typography>
            </Box>

            {/* Productos */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, mb: 1, color: "#8B4513" }}>
                🫓 Productos
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Producto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>Cant.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.detalle?.map((d) => (
                    <TableRow key={d.detalle_id}>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{d.producto}</Typography>
                        {d.descripcion && (
                          <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>{d.descripcion}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`×${d.cantidad}`} size="small"
                          sx={{ background: alpha("#023C81", 0.1), color: "#023C81", fontWeight: 800, fontSize: 11 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 12 }}>
                          ${Number(d.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Estado de cocina */}
            {data.estadoCocina && (
              <Box sx={{ p: 1.5, borderRadius: 2, background: alpha("#18A558", 0.05), border: `1px solid ${alpha("#18A558", 0.12)}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#18A558", display: "block", mb: 0.3 }}>
                  📋 Estado de cocina
                </Typography>
                <Typography variant="caption" sx={{ color: "#4A5B72", display: "block" }}>
                  Estado: <strong>{data.estadoCocina.estado}</strong>
                  {data.estadoCocina.cocinero ? ` · 👨‍🍳 ${data.estadoCocina.cocinero}` : ""}
                </Typography>
                {data.estadoCocina.fecha_inicio && (
                  <Typography variant="caption" sx={{ color: "#4A5B72", display: "block" }}>
                    Inicio:{" "}
                    {new Date(data.estadoCocina.fecha_inicio).toLocaleTimeString("es-MX", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {data.estadoCocina.fecha_fin
                      ? ` · Fin: ${new Date(data.estadoCocina.fecha_fin).toLocaleTimeString("es-MX", {
                          hour: "2-digit", minute: "2-digit",
                        })}`
                      : ""}
                  </Typography>
                )}
                {data.estadoCocina.observaciones && (
                  <Typography variant="caption" sx={{ color: "#4A5B72", display: "block", mt: 0.3 }}>
                    Obs: {data.estadoCocina.observaciones}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}