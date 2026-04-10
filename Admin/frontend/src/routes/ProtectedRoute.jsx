// src/routes/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";

/**
 * Protege una ruta verificando autenticación y rol.
 *
 * Props:
 *   roles  → array de roles permitidos, ej: ["administrador"]
 *            Si se omite, cualquier rol autenticado puede acceder.
 *   children → componente a renderizar si pasa la guardia
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Mientras verifica la sesión al cargar
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress sx={{ color: "#023C81" }} />
      </Box>
    );
  }

  // No autenticado → redirigir al login guardando la ruta intentada
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol no permitido → redirigir a su ruta por defecto
  if (roles && !roles.includes(user?.rol)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return children;
}