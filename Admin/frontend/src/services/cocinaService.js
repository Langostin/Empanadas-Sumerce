// src/services/cocinaService.js
import { api } from "./authService";

export const cocinaService = {
  // Cola en tiempo real
  getCola: () =>
    api.get("/cocina/cola").then((r) => r.data),

  // Detalle de un pedido
  getPedidoDetalle: (id) =>
    api.get(`/cocina/pedidos/${id}`).then((r) => r.data),

  // Cambiar estado: accion = "aceptar" | "listo" | "cancelar"
  cambiarEstado: (pedidoId, accion, observaciones = null) =>
    api
      .patch(`/cocina/pedidos/${pedidoId}/estado`, { accion, observaciones })
      .then((r) => r.data),

  // Métricas del día
  getMetricasHoy: () =>
    api.get("/cocina/metricas/hoy").then((r) => r.data),

  // Insumos críticos que afectan recetas
  getInsumosCriticos: () =>
    api.get("/cocina/insumos-criticos").then((r) => r.data),

  // Historial de hoy (pedidos ya terminados)
  getHistorialHoy: () =>
    api.get("/cocina/historial/hoy").then((r) => r.data),

  // Lista de cocineros disponibles
  getCocineros: () =>
    api.get("/cocina/cocineros").then((r) => r.data),
};