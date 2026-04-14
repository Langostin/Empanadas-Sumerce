// src/views/Inventario/InventarioView.jsx
import { useState } from "react";
import { Box, Tabs, Tab, alpha } from "@mui/material";
import InventoryIcon  from "@mui/icons-material/Inventory2Rounded";
import WarningIcon    from "@mui/icons-material/WarningAmberRounded";
import LocalGasIcon   from "@mui/icons-material/LocalGasStationRounded";
import ReceiptIcon    from "@mui/icons-material/ReceiptLongRounded";
import PointOfSaleIcon from "@mui/icons-material/PointOfSaleRounded";
import HistoryIcon    from "@mui/icons-material/HistoryRounded";

import ExistenciasTab   from "./tabs/ExistenciasTab";
import UrgentesTab      from "./tabs/UrgentesTab";
import GasolinaTab      from "./tabs/GasolinaTab";
import GastosTab        from "./tabs/GastosTab";
import CorteDiarioTab   from "./tabs/CorteDiarioTab";
import HistoricoTab     from "./tabs/HistoricoTab";

const TABS = [
  { label: "Existencias",      icon: <InventoryIcon   sx={{ fontSize: 18 }} />, desc: "i. Productos en stock" },
  { label: "Compras urgentes", icon: <WarningIcon     sx={{ fontSize: 18 }} />, desc: "ii. Stock crítico" },
  { label: "Gasolina",         icon: <LocalGasIcon    sx={{ fontSize: 18 }} />, desc: "iii. Combustible repartidores" },
  { label: "Gastos",           icon: <ReceiptIcon     sx={{ fontSize: 18 }} />, desc: "iv. Registro de gastos" },
  { label: "Corte diario",     icon: <PointOfSaleIcon sx={{ fontSize: 18 }} />, desc: "v. Cierre de caja" },
  { label: "Histórico",        icon: <HistoryIcon     sx={{ fontSize: 18 }} />, desc: "vi. Cortes anteriores" },
];

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;
}

export default function InventarioView() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* ── Tab bar ─────────────────────────────────── */}
      <Box
        sx={{
          background: "#fff",
          borderRadius: 3,
          border: "1px solid rgba(2,60,129,0.08)",
          mb: 0,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              background: "linear-gradient(90deg, #023C81, #1254A8)",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              fontFamily: "sans-serif",
              fontWeight: 600,
              fontSize: 12,
              textTransform: "none",
              color: "#4A5B72",
              gap: 0.7,
              minHeight: 56,
              px: 2.5,
              transition: "all 0.18s",
              "&:hover": { color: "#023C81", background: alpha("#023C81", 0.04) },
            },
            "& .Mui-selected": { color: "#023C81 !important" },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* ── Contenido de cada tab ───────────────────── */}
      <TabPanel value={tab} index={0}><ExistenciasTab /></TabPanel>
      <TabPanel value={tab} index={1}><UrgentesTab   /></TabPanel>
      <TabPanel value={tab} index={2}><GasolinaTab   /></TabPanel>
      <TabPanel value={tab} index={3}><GastosTab     /></TabPanel>
      <TabPanel value={tab} index={4}><CorteDiarioTab /></TabPanel>
      <TabPanel value={tab} index={5}><HistoricoTab  /></TabPanel>
    </Box>
  );
}