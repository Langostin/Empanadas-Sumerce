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

  // ==========================
// MERMAS
// ==========================

// Registrar merma
registrarMerma: (data) =>
  api.post("/cocina/mermas", data).then((r) => r.data),

// Métricas de mermas (para tus stats)
getMetricasMermasHoy: async () => {
  const r = await api.get("/cocina/mermas/metricas/hoy");
  return r.data.recordset ? r.data.recordset[0] : r.data;
},
hacerCorteMermas: () =>
  api.post("/cocina/mermas/corte").then((r) => r.data),
// Listado de mermas
getMermas: () =>
  api.get("/cocina/mermas").then((r) => r.data),
};