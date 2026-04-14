// src/components/Layout/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import {
  Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText,
  Tooltip, Divider, Typography, IconButton
} from "@mui/material";
import DashboardIcon    from "@mui/icons-material/SpaceDashboardRounded";
import InventoryIcon    from "@mui/icons-material/Inventory2Rounded";
import PeopleIcon       from "@mui/icons-material/PeopleAltRounded";
import BadgeIcon        from "@mui/icons-material/BadgeRounded";
import ShoppingBagIcon  from "@mui/icons-material/ShoppingBagRounded";
import RestaurantIcon   from "@mui/icons-material/RestaurantRounded";
import MenuIcon         from "@mui/icons-material/MenuRounded";
import ChevronLeftIcon  from "@mui/icons-material/ChevronLeftRounded";

const DRAWER_OPEN  = 240;
const DRAWER_CLOSE = 68;

const NAV = [
  { label: "Dashboard",  path: "/",           icon: <DashboardIcon /> },
  { label: "Clientes",   path: "/clientes",   icon: <PeopleIcon /> },
  { label: "Empleados",  path: "/empleados",  icon: <BadgeIcon /> },
  { label: "Pedidos",    path: "/pedidos",    icon: <ShoppingBagIcon /> },
  { label: "Inventario", path: "/inventario", icon: <InventoryIcon /> },
  { label: "Cocina",     path: "/cocina",     icon: <RestaurantIcon /> },
];

export default function Sidebar({ open, onToggle }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? open : true}
        onClose={onToggle}
        sx={{
          width: open ? DRAWER_OPEN : DRAWER_CLOSE,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile
              ? "100%" // 🔥 pantalla completa en móvil
              : open
              ? DRAWER_OPEN
              : DRAWER_CLOSE,
            transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
            overflowX: "hidden",
            background: "linear-gradient(180deg, #023C81 0%, #012459 100%)",
            border: "none",
            boxShadow: "4px 0 24px rgba(2,60,129,0.25)",
          },
        }}
      >
      {/* ── Logo / Toggle ─────────────────────────── */}
      <Box
        sx={{
          display: "flex", alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          px: open ? 2 : 0, py: 2.5, minHeight: 72,
        }}
      >
        {open && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Logo emoji como placeholder */}
            <Box
              sx={{
                width: 38, height: 38, borderRadius: 2,
                background: "linear-gradient(135deg, #FED817, #C9AC0E)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}
            >
              🥟
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "#FED817", fontFamily: "sans-serif", fontWeight: 800, lineHeight: 1.1 }}>
                Sumercé
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                Admin Panel
              </Typography>
            </Box>
          </Box>
        )}
        <IconButton onClick={onToggle} sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#FED817" } }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 1.5 }} />

      {/* ── Nav Items ─────────────────────────────── */}
      <List sx={{ px: 1, mt: 1, flexGrow: 1 }}>
        {NAV.map(({ label, path, icon }) => {
          const active = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Tooltip key={path} title={!open ? label : ""} placement="right">
              <ListItemButton
                onClick={() => navigate(path)}
                sx={{
                  borderRadius: 2.5, mb: 0.5,
                  justifyContent: open ? "initial" : "center",
                  px: open ? 2 : 1.5, py: 1.2,
                  background: active
                    ? "linear-gradient(135deg, rgba(254,216,23,0.18), rgba(254,216,23,0.08))"
                    : "transparent",
                  border: active ? "1px solid rgba(254,216,23,0.3)" : "1px solid transparent",
                  "&:hover": { background: "rgba(255,255,255,0.08)" },
                  transition: "all 0.18s",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 38 : "auto",
                    color: active ? "#FED817" : "rgba(255,255,255,0.55)",
                    "& svg": { fontSize: 22 },
                  }}
                >
                  {icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontFamily: "sans-serif",
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      color: active ? "#FED817" : "rgba(255,255,255,0.75)",
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* ── Footer ────────────────────────────────── */}
      {open && (
        <Box sx={{ p: 2, pb: 3 }}>
          <Box sx={{ borderRadius: 2, background: "rgba(254,216,23,0.08)", border: "1px solid rgba(254,216,23,0.2)", p: 1.5 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: 10, display: "block", mb: 0.3 }}>
              Versión 1.0.0
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.25)", fontSize: 9 }}>
              🇨🇴 Empanadas Sumercé
            </Typography>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}