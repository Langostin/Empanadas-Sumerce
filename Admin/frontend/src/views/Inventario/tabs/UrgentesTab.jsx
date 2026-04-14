// src/views/Inventario/tabs/UrgentesTab.jsx
import { Box, Card, CardContent, Grid, Typography, Chip, Button, Alert, Skeleton, alpha } from "@mui/material";
import PhoneIcon  from "@mui/icons-material/PhoneRounded";
import EmailIcon  from "@mui/icons-material/EmailRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { useStockCritico } from "../../../controllers/useInventario";

function InsumoCard({ item }) {
  const esAgotado = item.nivel === "agotado";
  const color     = esAgotado ? "#7B1FA2" : "#E53935";

  return (
    <Card
      sx={{
        border: `2px solid ${alpha(color, 0.3)}`,
        background: alpha(color, 0.03),
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""', position: "absolute",
          top: 0, left: 0, width: 4, height: "100%",
          background: color,
        },
      }}
    >
      <CardContent sx={{ pl: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontFamily: "sans-serif", fontWeight: 800, color, lineHeight: 1.2 }}>
              {item.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">{item.unidad_nombre}</Typography>
          </Box>
          <Chip
            label={esAgotado ? "🚫 AGOTADO" : "⚠️ CRÍTICO"}
            size="small"
            sx={{ background: alpha(color, 0.15), color, fontWeight: 800, fontSize: 10 }}
          />
        </Box>

        {/* Barra de stock */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color }}>
              Actual: {item.stock_actual} {item.unidad_clave}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mínimo: {item.stock_minimo} {item.unidad_clave}
            </Typography>
          </Box>
          <Box sx={{ height: 8, borderRadius: 4, background: alpha(color, 0.12), overflow: "hidden" }}>
            <Box
              sx={{
                height: "100%", borderRadius: 4,
                background: esAgotado ? color : `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
                width: `${Math.min((item.stock_actual / Math.max(item.stock_minimo, 0.01)) * 100, 100)}%`,
                transition: "width 0.5s ease",
              }}
            />
          </Box>
        </Box>

        {/* Proveedor */}
        {item.proveedor && (
          <Box
            sx={{
              p: 1.2, borderRadius: 2,
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#023C81", display: "block", mb: 0.3 }}>
              📦 {item.proveedor}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {item.telefono_proveedor && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: 12, color: "#4A5B72" }} />
                  <Typography variant="caption" sx={{ fontSize: 11 }}>{item.telefono_proveedor}</Typography>
                </Box>
              )}
              {item.email_proveedor && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 12, color: "#4A5B72" }} />
                  <Typography variant="caption" sx={{ fontSize: 11 }}>{item.email_proveedor}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {item.costo_unitario > 0 && (
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#4A5B72" }}>
            Costo unitario: <strong>${Number(item.costo_unitario).toFixed(2)}</strong> MXN
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function UrgentesTab() {
  const { criticos, loading, reload } = useStockCritico();

  const agotados = criticos.filter(c => c.nivel === "agotado");
  const criticos_ = criticos.filter(c => c.nivel === "critico");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81" }}>
            🛒 Compras urgentes
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {criticos.length} insumo{criticos.length !== 1 ? "s" : ""} requieren atención inmediata
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={reload} size="small" variant="outlined"
          sx={{ borderRadius: 2, fontFamily: "sans-serif", fontWeight: 600 }}>
          Actualizar
        </Button>
      </Box>

      {loading && (
        <Grid container spacing={2}>
          {[1,2,3,4].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton height={160} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      )}

      {!loading && !criticos.length && (
        <Alert severity="success" sx={{ borderRadius: 3 }}>
          ✅ ¡Todos los insumos tienen stock suficiente! No hay compras urgentes.
        </Alert>
      )}

      {/* Agotados */}
      {!loading && agotados.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: "#7B1FA2" }} />
            <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#7B1FA2" }}>
              AGOTADOS ({agotados.length})
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {agotados.map(c => (
              <Grid item xs={12} sm={6} md={4} key={c.insumo_id}>
                <InsumoCard item={c} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Críticos */}
      {!loading && criticos_.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: "#E53935" }} />
            <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#E53935" }}>
              STOCK CRÍTICO ({criticos_.length})
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {criticos_.map(c => (
              <Grid item xs={12} sm={6} md={4} key={c.insumo_id}>
                <InsumoCard item={c} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}