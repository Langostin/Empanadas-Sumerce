// src/components/Layout/AppLayout.jsx
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box, Typography, AppBar, Toolbar, Chip, Avatar,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  IconButton, alpha, Tooltip,
} from "@mui/material";
import LogoutIcon        from "@mui/icons-material/LogoutRounded";
import PersonIcon        from "@mui/icons-material/PersonRounded";
import LockIcon          from "@mui/icons-material/LockRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordDialog from "./ChangePasswordDialog";
import MenuIcon from "@mui/icons-material/MenuRounded";
import { useTheme, useMediaQuery } from "@mui/material";
const PAGE_TITLES = {
  "/":           { title: "Dashboard",          subtitle: "Métricas generales del sistema" },
  "/clientes":   { title: "Gestión de Clientes", subtitle: "Administrar usuarios del bot" },
  "/empleados":  { title: "Gestión de Empleados", subtitle: "Personal del negocio" },
  "/pedidos":    { title: "Pedidos",             subtitle: "Historial y seguimiento" },
  "/inventario": { title: "Inventario",          subtitle: "Gestión de productos" },
  "/cocina":     { title: "Panel de Cocina",     subtitle: "Cola de producción y control de insumos" },
};

const getPageTitle = (path) => {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  
  if (path.startsWith("/cocina")) return { title: "Panel de Cocina", subtitle: "Producción y control" };
  
  // Repartidor
  if (path.startsWith("/repartidor/escanear")) return { title: "Escanear Pedido", subtitle: "Apunta la cámara al código QR del pedido" };
  if (path.startsWith("/repartidor/ruta")) return { title: "Mis Entregas", subtitle: "Actualizado en tiempo real" };
  if (path.startsWith("/repartidor/confirmar")) return { title: "Confirmar Entrega", subtitle: "Ingresa el ID del pedido para registrar la entrega" };
  if (path.startsWith("/repartidor/mapa")) return { title: "Mapa de Entregas", subtitle: "Tus puntos de entrega activos" };
  if (path.startsWith("/repartidor/gastos")) return { title: "Gastos de Ruta", subtitle: "Registra y consulta tus gastos operativos" };
  if (path.startsWith("/repartidor/historial")) return { title: "Historial de Entregas", subtitle: "Registro de pedidos entregados" };

  // Vendedor
  if (path.startsWith("/vendedor/venta")) return { title: "Punto de Venta", subtitle: "Crea órdenes locales y efectúa el cobro" };
  if (path.startsWith("/vendedor/entregas")) return { title: "Entregas Locales", subtitle: "Gestiona las órdenes presenciales, retiros en tienda y a domicilio" };

  return PAGE_TITLES["/"];
};

const ROL_CHIP_COLORS = {
  administrador: { bg: alpha("#023C81", 0.10), color: "#023C81" },
  cocina:        { bg: alpha("#FF9800", 0.10), color: "#E65100" },
  repartidor:    { bg: alpha("#18A558", 0.10), color: "#0A7A3A" },
  vendedor:      { bg: alpha("#9C27B0", 0.10), color: "#7B1FA2" },
};

export default function AppLayout() {
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [menuAnchor,     setMenuAnchor]     = useState(null);
  const [changePassOpen, setChangePassOpen] = useState(false);

  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { user, logout, displayName, initials } = useAuth();

  const page      = getPageTitle(pathname);
  const rolColors = ROL_CHIP_COLORS[user?.rol] || ROL_CHIP_COLORS.administrador;
  const now       = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#F0F4FA" }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} rol={user?.rol} />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Top Bar ─────────────────────────────── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(2,60,129,0.08)",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ gap: 2, minHeight: "64px !important", px: { xs: 2, sm: 3 } }}>
          {isMobile && (
              <IconButton
                onClick={() => setSidebarOpen(true)}
                sx={{
                  mr: 1,
                  color: "#023C81"
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            {/* Título de la vista */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h1"
                sx={{ fontFamily: "sans-serif", fontSize: 32, fontWeight: 700, color: "#023C81", lineHeight: 1 }}
              >
                {page.title}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11 }}>
                {page.subtitle}
              </Typography>
            </Box>

            {/* Fecha */}
            <Chip
              label={now}
              size="small"
              sx={{
                display: { xs: "none", sm: "flex" },
                background: alpha("#023C81", 0.06),
                color: "#023C81",
                fontFamily: "sans-serif",
                fontWeight: 600,
                fontSize: 11,
              }}
            />

            {/* ── Usuario logueado ───────────────── */}
            <Tooltip title="Opciones de cuenta">
              <Box
                onClick={e => setMenuAnchor(e.currentTarget)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.2,
                  cursor: "pointer", borderRadius: 2.5,
                  px: 1.5, py: 0.8,
                  border: "1px solid rgba(2,60,129,0.10)",
                  background: "rgba(2,60,129,0.03)",
                  transition: "all 0.15s",
                  "&:hover": { background: "rgba(2,60,129,0.07)", borderColor: "rgba(2,60,129,0.2)" },
                  userSelect: "none",
                }}
              >
                <Avatar
                  sx={{
                    width: 34, height: 34, fontSize: 13, fontWeight: 800,
                    background: "linear-gradient(135deg, #023C81, #1254A8)",
                    fontFamily: "sans-serif",
                  }}
                >
                  {initials}
                </Avatar>

                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#0D1B2E", lineHeight: 1.2, fontSize: 13 }}
                  >
                    {displayName}
                  </Typography>
                  <Chip
                    label={user?.rol}
                    size="small"
                    sx={{
                      height: 16, fontSize: 9, fontWeight: 700,
                      fontFamily: "sans-serif",
                      background: rolColors.bg,
                      color:      rolColors.color,
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                </Box>

                <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#4A5B72" }} />
              </Box>
            </Tooltip>

            {/* ── Menú desplegable ──────────────── */}
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
              PaperProps={{
                sx: {
                  mt: 1, minWidth: 220, borderRadius: 3,
                  boxShadow: "0 8px 32px rgba(2,60,129,0.14)",
                  border: "1px solid rgba(2,60,129,0.08)",
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              {/* Cabecera del menú */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(2,60,129,0.08)" }}>
                <Typography variant="body2" sx={{ fontFamily: "sans-serif", fontWeight: 700, color: "#023C81" }}>
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {user?.email || user?.username}
                </Typography>
              </Box>

              <MenuItem
                onClick={() => { setMenuAnchor(null); setChangePassOpen(true); }}
                sx={{ py: 1.2, borderRadius: 1.5, mx: 0.5, my: 0.3, gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: "auto" }}>
                  <LockIcon fontSize="small" sx={{ color: "#4A5B72" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Cambiar contraseña"
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                />
              </MenuItem>

              <Divider sx={{ my: 0.5 }} />

              <MenuItem
                onClick={handleLogout}
                sx={{ py: 1.2, borderRadius: 1.5, mx: 0.5, mb: 0.5, gap: 1.5,
                      "&:hover": { background: alpha("#E53935", 0.06) } }}
              >
                <ListItemIcon sx={{ minWidth: "auto" }}>
                  <LogoutIcon fontSize="small" sx={{ color: "#E53935" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Cerrar sesión"
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 600, color: "#E53935" }}
                />
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* ── Contenido ─────────────────────────── */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      {/* ── Cambio de contraseña ─────────────── */}
      <ChangePasswordDialog
        open={changePassOpen}
        onClose={() => setChangePassOpen(false)}
      />
    </Box>
  );
}