// src/components/Layout/LoadingScreen.jsx
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoadingScreen({ message = "Cargando..." }) {
  return (
    <Box
      sx={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "60vh", gap: 2,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CircularProgress
          size={56}
          thickness={3}
          sx={{ color: "#023C81" }}
        />
        <Box
          sx={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 22,
          }}
        >
          🥟
        </Box>
      </Box>
      <Typography
        variant="body2"
        sx={{ color: "#4A5B72", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}
      >
        {message}
      </Typography>
    </Box>
  );
}