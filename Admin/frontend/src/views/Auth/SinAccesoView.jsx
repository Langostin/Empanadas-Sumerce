// src/views/Auth/SinAccesoView.jsx
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth, ROL_DEFAULT_ROUTE } from "../../context/AuthContext";

export default function SinAccesoView() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const dest      = ROL_DEFAULT_ROUTE[user?.rol] || "/login";

  return (
    <Box
      sx={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #F0F4FA, #E4EDF8)", gap: 2, p: 4,
      }}
    >
      <Box sx={{ fontSize: 64 }}>🚫</Box>
      <Typography variant="h4" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#023C81" }}>
        Acceso denegado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
        No tienes permisos para ver esta sección.
        {user && ` Tu rol es: ${user.rol}.`}
      </Typography>
      <Button
        variant="contained" onClick={() => navigate(dest)}
        sx={{ borderRadius: 2.5, fontFamily: "'Syne',sans-serif", fontWeight: 700,
              background: "linear-gradient(135deg, #023C81, #1254A8)" }}
      >
        Ir a mi panel
      </Button>
    </Box>
  );
}