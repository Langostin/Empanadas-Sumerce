// src/components/Charts/StatCard.jsx
import { Card, CardContent, Box, Typography, alpha } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUpRounded";

export default function StatCard({ title, value, subtitle, icon, color = "#023C81", formatter }) {
  const display = formatter ? formatter(value) : value?.toLocaleString("es-MX") ?? "—";

  return (
    <Card
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""', position: "absolute",
          top: -30, right: -30,
          width: 120, height: 120, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        },
        "&::after": {
          content: '""', position: "absolute",
          bottom: -40, right: 20,
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        },
      }}
    >
      <CardContent sx={{ position: "relative", zIndex: 1, p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography
          variant="h3"
          sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: { xs: 26, md: 32 }, lineHeight: 1 }}
        >
          {display}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85, fontWeight: 500, fontSize: 13 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ opacity: 0.65, fontSize: 11, display: "block", mt: 0.3 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}