// src/services/inventarioService.js
import { api } from "./authService";

export const inventarioService = {
  // Insumos (existencias)
  getInsumos:         (params = {}) => api.get("/inventario/insumos", { params }).then(r => r.data),
  createInsumo:       (body)        => api.post("/inventario/insumos", body).then(r => r.data),
  updateInsumo:       (id, body)    => api.put(`/inventario/insumos/${id}`, body).then(r => r.data),

  // Stock crítico
  getStockCritico:    ()            => api.get("/inventario/stock-critico").then(r => r.data),

  // Movimientos de inventario
  registrarMovimiento:(body)        => api.post("/inventario/movimientos", body).then(r => r.data),
  getMovimientos:     (insumoId)    => api.get(`/inventario/movimientos/${insumoId}`).then(r => r.data),

  // Gastos
  getGastos:          (params = {}) => api.get("/inventario/gastos", { params }).then(r => r.data),
  createGasto:        (body)        => api.post("/inventario/gastos", body).then(r => r.data),
  deleteGasto:        (id)          => api.delete(`/inventario/gastos/${id}`).then(r => r.data),
  getGasolina:        (params = {}) => api.get("/inventario/gastos/gasolina", { params }).then(r => r.data),
  getTiposGasto:      ()            => api.get("/inventario/tipos-gasto").then(r => r.data),

  // Corte de caja
  getCorteDiario:     ()            => api.get("/inventario/corte/hoy").then(r => r.data),
  ejecutarCorte:      (body)        => api.post("/inventario/corte/ejecutar", body).then(r => r.data),
  getHistoricoCortes: (params = {}) => api.get("/inventario/cortes/historico", { params }).then(r => r.data),

  // Catálogos
  getUnidades:        ()            => api.get("/inventario/unidades-medida").then(r => r.data),
  getTiposMovimiento: ()            => api.get("/inventario/tipos-movimiento").then(r => r.data),
  getProveedores:     ()            => api.get("/inventario/proveedores").then(r => r.data),
};