// src/views/Repartidor/EscanearView.jsx
import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Button, Alert, Chip, CircularProgress,
  Paper, Divider, alpha, Collapse,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CheckCircleIcon   from "@mui/icons-material/CheckCircleRounded";
import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import CloseIcon         from "@mui/icons-material/CloseRounded";
import { Html5Qrcode }   from "html5-qrcode";
import { repartidorService } from "../../services/repartidorService";

const QR_REGION_ID = "qr-reader";

export default function EscanearView() {
  const [scanning,   setScanning]   = useState(false);
  const [cargando,   setCargando]   = useState(false);
  const [resultado,  setResultado]  = useState(null); // pedido asignado
  const [error,      setError]      = useState("");
  const [camError,   setCamError]   = useState("");
  const scannerRef = useRef(null);

  // Limpiar scanner al desmontar
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const iniciarScanner = async () => {
    setError("");
    setCamError("");
    setResultado(null);
    setScanning(true);

    // Pequeño timeout para que el DOM renderice el div
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(QR_REGION_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // QR leído → detener y procesar
            scanner.stop().catch(() => {});
            setScanning(false);
            procesarQR(decodedText);
          },
          () => {} // onError silencioso (frames sin QR)
        );
      } catch (e) {
        setScanning(false);
        setCamError("No se pudo acceder a la cámara. Verifica los permisos.");
      }
    }, 200);
  };

  const detenerScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  const procesarQR = async (qr_codigo) => {
    setCargando(true);
    setError("");
    try {
      const data = await repartidorService.escanearQR(qr_codigo);
      setResultado(data.pedido);
    } catch (e) {
      setError(e.response?.data?.error || "Error al procesar el QR.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, maxWidth: 540, mx: "auto" }}>


      {/* Errores */}
      {(error || camError) && (
        <Alert severity="error" onClose={() => { setError(""); setCamError(""); }} sx={{ borderRadius: 2.5 }}>
          {error || camError}
        </Alert>
      )}

      {/* Visor QR */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "2px solid",
          borderColor: scanning ? "#023C81" : "rgba(2,60,129,0.12)",
          background: scanning ? "#000" : alpha("#023C81", 0.03),
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "all 0.3s",
        }}
      >
        {/* El div donde html5-qrcode inyecta el video */}
        <Box id={QR_REGION_ID} sx={{ width: "100%", "& video": { width: "100% !important" } }} />

        {/* Estado idle */}
        {!scanning && !cargando && !resultado && (
          <Box sx={{ textAlign: "center", p: 4 }}>
            <QrCodeScannerIcon sx={{ fontSize: 80, color: alpha("#023C81", 0.18), mb: 1 }} />
            <Typography sx={{ color: alpha("#0D1B2E", 0.4), fontFamily: "sans-serif", fontSize: 14 }}>
              Presiona "Activar Cámara" para escanear
            </Typography>
          </Box>
        )}

        {/* Loading */}
        {cargando && (
          <Box
            sx={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            }}
          >
            <CircularProgress sx={{ color: "#FED817" }} />
            <Typography sx={{ color: "#fff", fontFamily: "sans-serif", fontWeight: 600 }}>
              Verificando QR…
            </Typography>
          </Box>
        )}

        {/* Overlay de esquinas al escanear */}
        {scanning && (
          <Box
            sx={{
              position: "absolute", inset: 0, pointerEvents: "none",
              "&::before, &::after": {
                content: '""', position: "absolute",
                width: 40, height: 40, border: "3px solid #FED817",
              },
              "&::before": { top: "16%", left: "16%", borderRight: "none", borderBottom: "none", borderRadius: "4px 0 0 0" },
              "&::after":  { bottom: "16%", right: "16%", borderLeft: "none", borderTop: "none", borderRadius: "0 0 4px 0" },
            }}
          />
        )}
      </Paper>

      {/* Botón de acción */}
      {!scanning ? (
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<QrCodeScannerIcon />}
          onClick={iniciarScanner}
          disabled={cargando}
          sx={{
            background: "linear-gradient(135deg, #023C81, #0356B8)",
            color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 15,
            borderRadius: 3, py: 1.6,
            boxShadow: "0 4px 16px rgba(2,60,129,0.35)",
            "&:hover": { background: "linear-gradient(135deg, #012459, #023C81)", boxShadow: "0 6px 20px rgba(2,60,129,0.45)" },
          }}
        >
          📷 Activar Cámara
        </Button>
      ) : (
        <Button
          fullWidth variant="outlined" size="large"
          startIcon={<CloseIcon />}
          onClick={detenerScanner}
          sx={{
            borderColor: "#E53935", color: "#E53935", fontFamily: "sans-serif", fontWeight: 700,
            borderRadius: 3, py: 1.6,
            "&:hover": { background: alpha("#E53935", 0.06), borderColor: "#C62828" },
          }}
        >
          Detener
        </Button>
      )}

      {/* Resultado exitoso */}
      <Collapse in={!!resultado}>
        {resultado && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3.5, p: 2.5,
              background: "linear-gradient(135deg, rgba(24,165,88,0.06), rgba(24,165,88,0.02))",
              border: "1.5px solid rgba(24,165,88,0.25)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <CheckCircleIcon sx={{ color: "#18A558", fontSize: 22 }} />
              <Typography sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#18A558" }}>
                ¡Pedido asignado!
              </Typography>
            </Box>

            <Divider sx={{ mb: 1.5, borderColor: "rgba(24,165,88,0.15)" }} />

            {[
              { label: "Folio",     value: resultado.folio },
              { label: "Cliente",   value: resultado.cliente },
              { label: "Dirección", value: resultado.direccion_texto },
              { label: "Productos", value: resultado.productos },
              { label: "Total",     value: `$${Number(resultado.total || 0).toFixed(2)}` },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: "flex", gap: 1, mb: 0.8 }}>
                <Typography sx={{ fontFamily: "sans-serif", fontWeight: 600, color: "#4A5B72", fontSize: 13, minWidth: 80 }}>
                  {label}:
                </Typography>
                <Typography sx={{ fontFamily: "sans-serif", fontSize: 13, color: "#0D1B2E", fontWeight: 500 }}>
                  {value || "—"}
                </Typography>
              </Box>
            ))}

            <Chip
              icon={<LocalShippingIcon />}
              label="En camino 🛵"
              size="small"
              sx={{ mt: 1, background: alpha("#18A558", 0.1), color: "#18A558", fontWeight: 700 }}
            />

            <Button
              fullWidth variant="outlined" size="small"
              onClick={() => { setResultado(null); }}
              sx={{ mt: 1.5, borderRadius: 2, borderColor: alpha("#18A558", 0.4), color: "#18A558", fontFamily: "sans-serif", fontWeight: 600 }}
            >
              Escanear otro pedido
            </Button>
          </Paper>
        )}
      </Collapse>
    </Box>
  );
}