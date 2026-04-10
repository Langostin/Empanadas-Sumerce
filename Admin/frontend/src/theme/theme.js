// src/theme/theme.js
import { createTheme, alpha } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: "#023C81", light: "#1254A8", dark: "#012760", contrastText: "#fff" },
    secondary: { main: "#FED817", light: "#FFE55A", dark: "#C9AC0E", contrastText: "#023C81" },
    background: { default: "#F0F4FA", paper: "#FFFFFF" },
    text:       { primary: "#0D1B2E", secondary: "#4A5B72" },
    success:    { main: "#18A558" },
    warning:    { main: "#FED817" },
    error:      { main: "#E53935" },
    divider:    "rgba(2,60,129,0.10)",
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'Syne', sans-serif", fontWeight: 800 },
    h2: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Syne', sans-serif", fontWeight: 600 },
    h6: { fontFamily: "'Syne', sans-serif", fontWeight: 600 },
    button: { fontFamily: "'Syne', sans-serif", fontWeight: 600, textTransform: "none", letterSpacing: 0.3 },
  },
  shape: { borderRadius: 14 },
  shadows: [
    "none",
    "0 1px 4px rgba(2,60,129,0.06)",
    "0 2px 8px rgba(2,60,129,0.08)",
    "0 4px 16px rgba(2,60,129,0.10)",
    "0 8px 24px rgba(2,60,129,0.12)",
    ...Array(20).fill("0 12px 32px rgba(2,60,129,0.14)"),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingLeft: 20, paddingRight: 20 },
        containedPrimary: {
          background: "linear-gradient(135deg, #023C81, #1254A8)",
          "&:hover": { background: "linear-gradient(135deg, #012760, #023C81)" },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #FED817, #FFE55A)",
          color: "#023C81",
          "&:hover": { background: "linear-gradient(135deg, #C9AC0E, #FED817)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: "1px solid rgba(2,60,129,0.07)",
          boxShadow: "0 2px 12px rgba(2,60,129,0.06)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'Syne', sans-serif", fontWeight: 600 },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          fontFamily: "'DM Sans', sans-serif",
          "& .MuiDataGrid-columnHeader": {
            background: "linear-gradient(135deg, #023C81, #1254A8)",
            color: "#fff",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
          },
          "& .MuiDataGrid-row:hover": { background: alpha("#023C81", 0.04) },
        },
      },
    },
  },
});