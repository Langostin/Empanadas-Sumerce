// src/models/index.js
/**
 * @typedef {Object} Cliente
 * @property {string}  whatsapp
 * @property {string}  nombre_completo
 * @property {string}  nombre
 * @property {string}  apellidos
 * @property {string}  email
 * @property {string}  genero
 * @property {number}  total_pedidos
 * @property {number}  total_gastado
 * @property {boolean} activo
 * @property {boolean} bloqueo_sordo
 * @property {boolean} bloqueo_ia
 * @property {string}  fecha_creacion
 * @property {string}  sesion_estado
 */

/**
 * @typedef {Object} Empleado
 * @property {number}  empleado_id
 * @property {string}  nombre
 * @property {string}  apellidos
 * @property {string}  email
 * @property {string}  telefono_whatsapp
 * @property {number}  sueldo_mensual
 * @property {boolean} activo
 * @property {string}  fecha_alta
 * @property {string}  rol
 * @property {number}  rol_id
 */

/**
 * @typedef {Object} Pedido
 * @property {number}  pedido_id
 * @property {string}  folio
 * @property {string}  whatsapp
 * @property {string}  cliente
 * @property {string}  tipo_pedido
 * @property {string}  tipo_entrega
 * @property {string}  estado_pedido
 * @property {string}  estado_pago
 * @property {number}  total
 * @property {string}  fecha_pedido
 */

/**
 * @typedef {Object} DashboardMetrics
 * @property {number}   totalClientes
 * @property {number}   totalEmpleados
 * @property {number}   totalPedidos
 * @property {number}   totalEventos
 * @property {number}   totalIngresos
 * @property {Array}    topClientes
 * @property {Array}    ventasMes
 */

export const ESTADO_PEDIDO_COLORS = {
  recibido:   "#FED817",
  en_cocina:  "#FF9800",
  listo:      "#2196F3",
  en_camino:  "#9C27B0",
  entregado:  "#18A558",
  cancelado:  "#E53935",
};

export const ESTADO_PAGO_COLORS = {
  pendiente:   "#FF9800",
  pagado:      "#18A558",
  fallido:     "#E53935",
  reembolsado: "#9C27B0",
};

export const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];