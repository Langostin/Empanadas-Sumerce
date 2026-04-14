// src/views/Cocina/tabs/HistorialTab.jsx
import {
  Box, Typography, Card, Chip, Skeleton, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
  alpha,
} from "@mui/material";
import AccessTimeIcon    from "@mui/icons-material/AccessTimeRounded";
import CheckCircleIcon   from "@mui/icons-material/CheckCircleRounded";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDiningRounded";
import StorefrontIcon    from "@mui/icons-material/StorefrontRounded";
import { useHistorialCocina } from "../../../controllers/useCocina";

const ESTADO_COLORS = {
  listo:     { color: "#18A558", bg: alpha("#18A558", 0.1),  label: "Listo" },
  en_camino: { color: "#023C81", bg: alpha("#023C81", 0.1),  label: "En camino" },
  entregado: { color: "#7B1FA2", bg: alpha("#7B1FA2", 0.1),  label: "Entregado" },
};

export default function HistorialTab() {
  const { historial, loading } = useHistorialCocina();

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={56} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (!historial.length) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: "center",
          background: alpha("#18A558", 0.03),
          borderRadius: 4,
          border: `1.5px dashed ${alpha("#18A558", 0.15)}`,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 48, color: alpha("#18A558", 0.25), mb: 1 }} />
        <Typography variant="h6" sx={{ color: alpha("#18A558", 0.5), fontFamily: "sans-serif", fontWeight: 700 }}>
          Sin pedidos completados hoy
        </Typography>
        <Typography variant="caption" sx={{ color: "#4A5B72" }}>
          Aquí aparecerán los pedidos que han sido marcados como listos.
        </Typography>
      </Box>
    );
  }

  // Totales del historial
  const totalEmpanadas = historial.reduce((s, h) => s + (h.total_empanadas || 0), 0);
  const tiempoPromedio = historial.filter((h) => h.minutos_produccion > 0).length > 0
    ? Math.round(
        historial.filter((h) => h.minutos_produccion > 0)
          .reduce((s, h) => s + h.minutos_produccion, 0) /
        historial.filter((h) => h.minutos_produccion > 0).length
      )
    : 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Resumen */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Box
          sx={{
            px: 2, py: 1.2, borderRadius: 2.5,
            background: alpha("#18A558", 0.08),
            border: `1px solid ${alpha("#18A558", 0.2)}`,
            display: "flex", alignItems: "center", gap: 0.8,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 16, color: "#18A558" }} />
          <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558" }}>
            {historial.length} pedidos completados
          </Typography>
        </Box>
        <Box
          sx={{
            px: 2, py: 1.2, borderRadius: 2.5,
            background: alpha("#8B4513", 0.08),
            border: `1px solid ${alpha("#8B4513", 0.2)}`,
            display: "flex", alignItems: "center", gap: 0.8,
          }}
        >
          <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#8B4513" }}>
            🫓 {totalEmpanadas} empanadas producidas
          </Typography>
        </Box>
        {tiempoPromedio > 0 && (
          <Box
            sx={{
              px: 2, py: 1.2, borderRadius: 2.5,
              background: alpha("#7B1FA2", 0.08),
              border: `1px solid ${alpha("#7B1FA2", 0.2)}`,
              display: "flex", alignItems: "center", gap: 0.8,
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 16, color: "#7B1FA2" }} />
            <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#7B1FA2" }}>
              {tiempoPromedio} min promedio
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tabla de historial */}
      <Card>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, fontSize: 11, color: "#4A5B72", background: alpha("#023C81", 0.03) } }}>
              <TableCell>Folio</TableCell>
              <TableCell>Productos</TableCell>
              <TableCell align="center">Entrega</TableCell>
              <TableCell align="center">Tiempo</TableCell>
              <TableCell>Cocinero</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historial.map((h) => {
              const cfg = ESTADO_COLORS[h.estado_pedido] || ESTADO_COLORS.listo;
              return (
                <TableRow
                  key={h.pedido_id}
                  sx={{ "&:hover": { background: alpha("#023C81", 0.02) } }}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81" }}>
                      {h.folio}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "#4A5B72", fontSize: 10 }}>
                      {new Date(h.fecha_pedido).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="caption" sx={{ fontSize: 11 }}>
                      {h.productos}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "#8B4513", fontSize: 10, fontWeight: 600 }}>
                      {h.total_empanadas} empanada{h.total_empanadas > 1 ? "s" : ""}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {h.tipo_entrega === "domicilio"
                      ? <DeliveryDiningIcon sx={{ fontSize: 16, color: "#023C81" }} />
                      : <StorefrontIcon    sx={{ fontSize: 16, color: "#FF9800" }} />}
                  </TableCell>

                  <TableCell align="center">
                    {h.minutos_produccion > 0 ? (
                      <Chip
                        label={`${h.minutos_produccion} min`}
                        size="small"
                        icon={<AccessTimeIcon style={{ fontSize: 11 }} />}
                        sx={{
                          fontSize: 10,
                          height: 20,
                          background: alpha("#7B1FA2", 0.1),
                          color: "#7B1FA2",
                          fontWeight: 700,
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: "#ccc" }}>—</Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 11 }}>
                      {h.cocinero || "—"}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={cfg.label}
                      size="small"
                      sx={{
                        background: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}