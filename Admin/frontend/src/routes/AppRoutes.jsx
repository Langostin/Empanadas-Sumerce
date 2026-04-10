// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute    from "./ProtectedRoute";
import AppLayout         from "../components/Layout/AppLayout";
import LoginView         from "../views/Auth/LoginView";
import ResetPasswordView from "../views/Auth/ResetPasswordView";
import SinAccesoView     from "../views/Auth/SinAccesoView";
import DashboardView     from "../views/Dashboard/DashboardView";
import ClientesView      from "../views/Clientes/ClientesView";
import EmpleadosView     from "../views/Empleados/EmpleadosView";
import PedidosView       from "../views/Pedidos/PedidosView";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Rutas públicas ─────────────────────── */}
      <Route path="/login"          element={<LoginView />} />
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route path="/sin-acceso"     element={<SinAccesoView />} />

      {/* ── Panel de administrador ─────────────── */}
      <Route
        element={
          <ProtectedRoute roles={["administrador"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/"          element={<DashboardView />} />
        <Route path="/clientes"  element={<ClientesView />} />
        <Route path="/empleados" element={<EmpleadosView />} />
        <Route path="/pedidos"   element={<PedidosView />} />
      </Route>

      {/* ── Rutas de otros roles (placeholders) ── */}
      {/* Cocina y repartidor: protegidas pero aún sin vista */}
      <Route
        path="/cocina"
        element={
          <ProtectedRoute roles={["cocina", "administrador"]}>
            <div style={{ padding: 40, fontFamily: "Syne,sans-serif" }}>
              🍳 Panel de Cocina — próximamente
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repartidor"
        element={
          <ProtectedRoute roles={["repartidor", "administrador"]}>
            <div style={{ padding: 40, fontFamily: "Syne,sans-serif" }}>
              🚚 Panel de Repartidor — próximamente
            </div>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}