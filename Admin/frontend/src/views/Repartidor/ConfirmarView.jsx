// src/views/Repartidor/ConfirmarView.jsx
import { useState } from "react";
import {
  Box, Typography, TextField, Button, Alert, Collapse,
  Paper, Divider, CircularProgress, alpha, InputAdornment,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import TagIcon from "@mui/icons-material/Tag";
import { repartidorService } from "../../services/repartidorService";

export default function ConfirmarView() {
  const [pedidoId,  setPedidoId]  = useState("");
  const [cargando,  setCargando]  = useState(false);
  const [exito,     setExito]     = useState(null);   // { folio }
  const [error,     setError]     = useState("");

  const confirmar = async () => {
    if (!pedidoId.trim()) {
      setError("Ingresa el número de pedido.");
      return;
    }
    setCargando(true);
    setError("");
    setExito(null);
    try {
      const data = await repartidorService.confirmarEntrega(parseInt(pedidoId));
      setExito(data);
      setPedidoId("");
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo confirmar la entrega.");
    } finally {
      setCargando(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") confirmar();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, maxWidth: 500, mx: "auto" }}>


      {/* Card principal */}
      <Paper
        elevation={0}
        sx={{
          p: 3, borderRadius: 4,
          border: "1.5px solid rgba(2,60,129,0.1)",
          background: "#fff",
          boxShadow: "0 2px 20px rgba(2,60,129,0.06)",
        }}
      >
        <Typography
          sx={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, color: "#4A5B72", mb: 2, textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          ID del Pedido
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ej: 142"
          value={pedidoId}
          onChange={(e) => {
            const limpio = e.target.value
              .replace(/[^a-zA-Z0-9]/g, "") // solo letras y números
              .toUpperCase();              // convertir a MAYÚSCULAS

            setPedidoId(limpio);
            setError("");
            setExito(null);
          }}
          onKeyDown={handleKey}
          type="text"
          disabled={cargando}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <TagIcon sx={{ color: "#023C81", fontSize: 20 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2.5,
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 18,
              "& input": { py: 1.6 },
            },
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#023C81", borderWidth: 2,
              },
            },
          }}
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={confirmar}
          disabled={cargando || !pedidoId.trim()}
          startIcon={
            cargando ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <CheckCircleIcon />
          }
          sx={{
            background: "linear-gradient(135deg, #18A558, #0D7A3E)",
            color: "#fff",
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 3,
            py: 1.6,
            boxShadow: "0 4px 16px rgba(24,165,88,0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #0D7A3E, #0A5E30)",
              boxShadow: "0 6px 20px rgba(24,165,88,0.45)",
            },
            "&.Mui-disabled": { background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.26)" },
          }}
        >
          {cargando ? "Confirmando…" : "Confirmar Entrega"}
        </Button>
      </Paper>

      {/* Error */}
      <Collapse in={!!error}>
        <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      </Collapse>

      {/* Éxito */}
      <Collapse in={!!exito}>
        {exito && (
          <Paper
            elevation={0}
            sx={{
              p: 3, borderRadius: 3.5,
              background: "linear-gradient(135deg, rgba(24,165,88,0.07), rgba(24,165,88,0.02))",
              border: "1.5px solid rgba(24,165,88,0.3)",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #18A558, #0D7A3E)",
                display: "flex", alignItems: "center", justifyContent: "center",
                mx: "auto", mb: 1.5,
                boxShadow: "0 4px 16px rgba(24,165,88,0.4)",
                animation: "pop 0.3s ease",
                "@keyframes pop": {
                  "0%":   { transform: "scale(0)" },
                  "70%":  { transform: "scale(1.1)" },
                  "100%": { transform: "scale(1)" },
                },
              }}
            >
              <CheckCircleIcon sx={{ color: "#fff", fontSize: 36 }} />
            </Box>
            <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 18, color: "#18A558", mb: 0.5 }}>
              ¡Entrega confirmada!
            </Typography>
            <Typography sx={{ fontFamily: "sans-serif", color: "#4A5B72", fontSize: 14 }}>
              Pedido <strong style={{ color: "#0D1B2E" }}>{exito.folio}</strong> marcado como entregado.
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: "rgba(24,165,88,0.15)" }} />
            <Button
              size="small"
              onClick={() => setExito(null)}
              sx={{ color: "#18A558", fontFamily: "sans-serif", fontWeight: 600, textTransform: "none" }}
            >
              Confirmar otro pedido
            </Button>
          </Paper>
        )}
      </Collapse>
    </Box>
  );
}