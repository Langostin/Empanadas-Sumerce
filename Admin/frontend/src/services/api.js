// src/services/api.js
// ─────────────────────────────────────────────────────────────
//  Instancia axios con interceptor de JWT automático.
//  El token se lee de localStorage en cada request.
//  Si el servidor responde 401 (TOKEN_EXPIRED), intenta hacer
//  refresh una sola vez. Si el refresh también falla, limpia
//  el storage y redirige al login.
// ─────────────────────────────────────────────────────────────
import axios from "axios";

// Importamos el api autenticado de authService para no duplicar lógica.
// authService ya tiene los interceptores de refresh configurados.
import { api } from "./authService";

// ── Dashboard ─────────────────────────────────
export const dashboardService = {
  getMetricas:      () => api.get("/dashboard/metricas").then(r => r.data),
  getEstadosPedido: () => api.get("/dashboard/estados-pedido").then(r => r.data),
  getHoy:           () => api.get("/dashboard/hoy").then(r => r.data),
};

// ── Clientes ──────────────────────────────────
export const clientesService = {
  getAll:      (params = {}) => api.get("/clientes", { params }).then(r => r.data),
  getMetricas: (wa)          => api.get(`/clientes/${encodeURIComponent(wa)}/metricas`).then(r => r.data),
  patchEstado: (wa, body)    => api.patch(`/clientes/${encodeURIComponent(wa)}/estado`, body).then(r => r.data),
};

// ── Empleados ─────────────────────────────────
export const empleadosService = {
  getAll:      (params = {}) => api.get("/empleados", { params }).then(r => r.data),
  getMetricas: (id)          => api.get(`/empleados/${id}/metricas`).then(r => r.data),
  create:      (body)        => api.post("/empleados", body).then(r => r.data),
  update:      (id, body)    => api.put(`/empleados/${id}`, body).then(r => r.data),
  delete:      (id)          => api.delete(`/empleados/${id}`).then(r => r.data),
  getRoles:    ()            => api.get("/roles").then(r => r.data),
};

// ── Pedidos ───────────────────────────────────
export const pedidosService = {
  getAll: (params = {}) => api.get("/pedidos", { params }).then(r => r.data),
};