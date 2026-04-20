// src/services/repartidorService.js
import { api } from "./authService";

export const repartidorService = {
  // Pedidos asignados al repartidor en curso
  getMisPedidos: () =>
    api.get("/repartidor/mis-pedidos").then((r) => r.data),

  // Pedidos con coordenadas para el mapa
  getMapa: () =>
    api.get("/repartidor/mapa").then((r) => r.data),

  // Historial de entregas
  getHistorial: (params = {}) =>
    api.get("/repartidor/historial", { params }).then((r) => r.data),

  // Escanear QR y asociar pedido
  escanearQR: (qr_codigo) =>
    api.post("/repartidor/escanear", { qr_codigo }).then((r) => r.data),

  // Confirmar entrega
confirmarEntrega: (codigo) =>
  api.post("/repartidor/confirmar", { codigo })
      .then((r) => r.data),

  // Gastos
  getGastos: (params = {}) =>
    api.get("/repartidor/gastos", { params }).then((r) => r.data),

  registrarGasto: (body) =>
    api.post("/repartidor/gastos", body).then((r) => r.data),
};
