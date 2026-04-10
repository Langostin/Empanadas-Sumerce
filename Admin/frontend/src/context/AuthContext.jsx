// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

// Mapa de roles → ruta de inicio tras el login
export const ROL_DEFAULT_ROUTE = {
  administrador: "/",
  cocina:        "/cocina",      // vista futura
  repartidor:    "/repartidor",  // vista futura
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => authService.getLocalUser());
  const [loading, setLoading] = useState(true);

  // Verificar y restaurar sesión al cargar la app
  useEffect(() => {
    const verify = async () => {
      const localUser = authService.getLocalUser();
      
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        // Intenta validar el token con el backend
        const fresh = await authService.restoreSession();
        const updated = {
          empleadoId: fresh.empleado_id,
          nombre:     fresh.nombre,
          apellidos:  fresh.apellidos,
          email:      fresh.email,
          username:   fresh.username,
          rol:        fresh.rol,
          rolId:      fresh.rol_id,
        };
        setUser(updated);
      } catch (error) {
        // Si la validación falla, usa el usuario del localStorage
        if (localUser) {
          setUser(localUser);
        } else {
          // Solo limpiar si no hay usuario guardado
          authService.logout();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (username, password) => {
    const userData = await authService.login(username, password);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin:         user?.rol === "administrador",
    isCocina:        user?.rol === "cocina",
    isRepartidor:    user?.rol === "repartidor",
    defaultRoute:    ROL_DEFAULT_ROUTE[user?.rol] || "/",
    /** Nombre para mostrar en UI */
    displayName:     user ? `${user.nombre} ${user.apellidos || ""}`.trim() : "",
    /** Inicial del avatar */
    initials:        user
      ? `${user.nombre?.[0] || ""}${user.apellidos?.[0] || ""}`.toUpperCase()
      : "?",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para consumir el contexto */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}