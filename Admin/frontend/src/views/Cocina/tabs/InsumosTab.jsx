// src/views/Cocina/tabs/InsumosTab.jsx
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Skeleton, Alert, alpha,
} from "@mui/material";
import WarningAmberIcon  from "@mui/icons-material/WarningAmberRounded";
import BlockIcon         from "@mui/icons-material/BlockRounded";
import PhoneIcon         from "@mui/icons-material/PhoneRounded";
import { useInsumosCriticosCocina } from "../../../controllers/useCocina";

export default function InsumosTab() {
  const { insumos, loading } = useInsumosCriticosCocina();

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton height={140} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!insumos.length) {
    return (
      <Box
        sx={{
          py: 8,
          textAlign: "center",
          background: alpha("#18A558", 0.04),
          borderRadius: 4,
          border: `1.5px dashed ${alpha("#18A558", 0.2)}`,
        }}
      >
        <Typography sx={{ fontSize: 40, mb: 1 }}>✅</Typography>
        <Typography variant="h6" sx={{ color: "#18A558", fontFamily: "sans-serif", fontWeight: 700 }}>
          Todos los insumos están en nivel óptimo
        </Typography>
        <Typography variant="caption" sx={{ color: "#4A5B72" }}>
          No hay ingredientes críticos que afecten las recetas activas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert
        severity="warning"
        icon={<WarningAmberIcon />}
        sx={{ borderRadius: 2.5 }}
      >
        <strong>{insumos.length} insumo{insumos.length > 1 ? "s" : ""}</strong> con stock por debajo del
        mínimo afecta{insumos.length === 1 ? "" : "n"} las recetas. Notifica a administración para reponer.
      </Alert>

      <Grid container spacing={2}>
        {insumos.map((ins) => {
          const esAgotado = ins.nivel === "agotado";
          const color     = esAgotado ? "#7B1FA2" : "#E53935";

          return (
            <Grid item xs={12} sm={6} md={4} key={ins.insumo_id}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: `1.5px solid ${alpha(color, 0.25)}`,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <CardContent sx={{ pb: "16px !important" }}>
                  {/* Encabezado */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 14, color: "#1a1a2e", lineHeight: 1.2 }}>
                      {ins.insumo}
                    </Typography>
                    <Chip
                      icon={esAgotado ? <BlockIcon style={{ fontSize: 12 }} /> : <WarningAmberIcon style={{ fontSize: 12 }} />}
                      label={esAgotado ? "Agotado" : "Crítico"}
                      size="small"
                      sx={{
                        background: alpha(color, 0.1),
                        color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {/* Stock */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 1.2,
                      p: 1,
                      borderRadius: 2,
                      background: alpha(color, 0.05),
                    }}
                  >
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>
                        {ins.stock_actual}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                        actual ({ins.unidad})
                      </Typography>
                    </Box>
                    <Box sx={{ width: 1, bgcolor: alpha(color, 0.2) }} />
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 18, color: "#4A5B72", lineHeight: 1 }}>
                        {ins.stock_minimo}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                        mínimo
                      </Typography>
                    </Box>
                  </Box>

                  {/* Productos afectados */}
                  <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10, display: "block", mb: 0.5 }}>
                    <strong>Afecta:</strong> {ins.productos_afectados}
                  </Typography>

                  {/* Proveedor */}
                  {ins.proveedor && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 11, color: "#4A5B72" }} />
                      <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                        {ins.proveedor}
                        {ins.tel_proveedor ? ` · ${ins.tel_proveedor}` : ""}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}