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
import InventarioView    from "../views/Inventario/InventarioView";
import CocinaView        from "../views/Cocina/CocinaView";

import OrdenesCocinaView   from "../views/Cocina/OrdenesCocinaView";
import CocinaInventarioView      from "../views/Cocina/InventarioView";
import EmpaqueView         from "../views/Cocina/EmpaqueView";
import RutaView            from "../views/Cocina/RutaView";
import ProveedoresView     from "../views/Cocina/ProveedoresView";
import MermasView          from "../views/Cocina/MermasView";

import RutaRepartidorView from "../views/Repartidor/RutaRepartidorView";
import ConfirmarView from "../views/Repartidor/ConfirmarView";
import MapaView from "../views/Repartidor/MapaView";
import GastosView from "../views/Repartidor/GastosVIew";
import HistorialView from "../views/Repartidor/HistorialView";
import EscanearView from "../views/Repartidor/EscanearView";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Rutas públicas ─────────────────────── */}
      <Route path="/login"          element={<LoginView />} />
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route path="/sin-acceso"     element={<SinAccesoView />} />
            {/* ── Rutas públicas ─────────────────────── */}
      <Route path="/login"          element={<LoginView />} />
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route path="/sin-acceso"     element={<SinAccesoView />} />

      {/* ── ADMIN ─────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute roles={["administrador"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/"           element={<DashboardView />} />
        <Route path="/clientes"   element={<ClientesView />} />
        <Route path="/empleados"  element={<EmpleadosView />} />
        <Route path="/pedidos"    element={<PedidosView />} />
        <Route path="/inventario" element={<InventarioView />} />
      </Route>

      {/* ── COCINA ────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute roles={["cocina", "administrador"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/cocina" element={<Navigate to="/cocina/ordenes" replace />} />

        <Route path="/cocina/ordenes" element={<OrdenesCocinaView/>} />
        <Route path="/cocina/inventario" element={<CocinaInventarioView />} />
        <Route path="/cocina/empaque" element={<EmpaqueView />} />
        <Route path="/cocina/ruta" element={<RutaView />} />
        <Route path="/cocina/proveedores" element={<ProveedoresView />} />
        <Route path="/cocina/mermas" element={<MermasView />} />
      </Route>

      {/* ── REPARTIDOR ────────────────────────── */}
      <Route
        element={
          <ProtectedRoute roles={["repartidor", "administrador"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Redirect principal */}
        <Route path="/repartidor" element={<Navigate to="/repartidor/ruta" replace />} />

        {/* Vistas */}
          <Route path="/repartidor/escanear" element={<EscanearView />} />
          <Route path="/repartidor/ruta" element={<RutaRepartidorView />} />
          <Route path="/repartidor/confirmar" element={<ConfirmarView />} />
          <Route path="/repartidor/mapa" element={<MapaView />} />
          <Route path="/repartidor/gastos" element={<GastosView />} />
          <Route path="/repartidor/historial" element={<HistorialView />} />
      </Route>

      {/* ── Fallback ─────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}