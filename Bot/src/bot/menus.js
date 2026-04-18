/**
 * src/bot/menus.js
 * Todos los menús del bot. Cada función recibe (sock, jid) y envía el menú.
 */
const { sendText } = require("./frases")

async function sendMenu(sock, jid, { title, body, sections }) {
  let msg = `*${title}*\n${body}\n\n`
  let n = 1
  for (const section of sections) {
    if (section.title) msg += `_${section.title}_\n`
    for (const row of section.rows) {
      msg += `${n}. ${row.title}${row.description ? " — " + row.description : ""}\n`
      n++
    }
    msg += "\n"
  }
  msg += "_Responde con el número de tu opción._"
  await sendText(sock, jid, msg)
}

const MENUS = {
  principal: (sock, jid) => sendMenu(sock, jid, {
    title: "Empanadas Sumercé 🇨🇴🥟",
    body:  "¿Qué hacemos hoy?",
    sections: [
      { title: "Pedidos", rows: [
        { title: "1. Orden individual",   description: "Empanadas para ti" },
        { title: "2. Pedido para evento", description: "Cotización en cantidad" },
      ]},
      { title: "Mi cuenta", rows: [
        { title: "3. Mis pedidos", description: "Ver historial" },
        { title: "4. Mis datos",   description: "Ver mis datos guardados" },
      ]},
      { title: "Info", rows: [
        { title: "5. Productos y precios", description: "¿Qué vendemos?" },
        { title: "6. Dónde estamos",       description: "Dirección" },
        { title: "7. Horario",             description: "¿Cuándo estamos abiertos?" },
        { title: "8. Contacto",            description: "Hablar con un humano" },
      ]},
    ],
  }),

  tipoEmpanada: (sock, jid) => sendMenu(sock, jid, {
    title: "Tipo de empanada 🥟",
    body:  "¿Cuál se le antoja?",
    sections: [{ title: "Opciones", rows: [
      { title: "1. De carne 🥩", description: "Carne molida sazonada — $25 MXN" },
      { title: "2. De pollo 🍗", description: "Pollo desmechado — $25 MXN" },
      { title: "3. Mixta 🍽️",   description: "Mitad carne, mitad pollo" },
    ]}],
  }),

  cantidad: (sock, jid) => sendMenu(sock, jid, {
    title: "¿Cuántas empanadas? 🔢",
    body:  "Selecciona o escribe el número:",
    sections: [{ title: "Cantidades", rows: [
      { title: "1. Una (1)",       description: "$25 MXN" },
      { title: "2. Tres (3)",      description: "$70 MXN" },
      { title: "3. Seis (6)",      description: "$135 MXN" },
      { title: "4. Doce (12)",     description: "$260 MXN" },
      { title: "5. Otra cantidad", description: "Escribe el número que quieras" },
    ]}],
  }),

  entrega: (sock, jid) => sendMenu(sock, jid, {
    title: "¿Cómo recibe su pedido? 🚚",
    body:  "Elige la forma de entrega:",
    sections: [{ title: "Opciones", rows: [
      { title: "1. A domicilio 🏠",       description: "Te lo llevamos" },
      { title: "2. Recoger en tienda 🏪", description: "Pasas tú por él" },
    ]}],
  }),

  pago: (sock, jid) => sendMenu(sock, jid, {
    title: "Método de pago 💳",
    body:  "¿Cómo va a pagar?",
    sections: [{ title: "Opciones", rows: [
      { title: "1. Efectivo 💵",                 description: "Pagas al recibir" },
      { title: "2. Tarjeta (débito/crédito) 💳", description: "Link de pago seguro" },
    ]}],
  }),

  factura: (sock, jid) => sendMenu(sock, jid, {
    title: "¿Necesita factura? 🧾",
    body:  "¿Requiere CFDI?",
    sections: [{ title: "Opciones", rows: [
      { title: "1. Sí, necesito factura", description: "Le pedimos datos del SAT" },
      { title: "2. No, gracias",          description: "Continúa sin factura" },
    ]}],
  }),

  regimen: (sock, jid) => sendMenu(sock, jid, {
    title: "Régimen fiscal 🏛️",
    body:  "Selecciona tu régimen ante el SAT:",
    sections: [
      { title: "Personas Físicas", rows: [
        { title: "1. Sueldos y Salarios",        description: "Régimen 605" },
        { title: "2. Actividades Empresariales", description: "Régimen 612" },
        { title: "3. Incorporación Fiscal",      description: "Régimen 621" },
        { title: "4. Arrendamiento",             description: "Régimen 606" },
        { title: "5. Sin obligaciones fiscales", description: "Régimen 616" },
        { title: "6. Plataformas Tecnológicas",  description: "Régimen 625" },
        { title: "7. Simplificado de Confianza", description: "Régimen 626" },
      ]},
      { title: "Personas Morales", rows: [
        { title: "8. General Ley Personas Morales", description: "Régimen 601" },
        { title: "9. Otro / No sé",                 description: "Usaremos 616" },
      ]},
    ],
  }),

  calificacion: (sock, jid, tipo) => sendMenu(sock, jid, {
    title: tipo === "tiempo" ? "¿Cómo estuvo la entrega? ⏱️" : "¿Qué tal la comida? 🥟",
    body:  "Califica del 1 al 5:",
    sections: [{ title: "Calificación", rows: [
      { title: "1. Excelente ⭐⭐⭐⭐⭐" },
      { title: "2. Muy bien ⭐⭐⭐⭐" },
      { title: "3. Regular  ⭐⭐⭐" },
      { title: "4. Malo     ⭐⭐" },
      { title: "5. Pésimo   ⭐" },
    ]}],
  }),
}

// Mapa numérico: step → array de valores resueltos (índice = número - 1)
const NUMERIC_MAPS = {
  inicio:                 ["orden_individual","orden_evento","mis_pedidos","mis_datos","info_productos","info_ubicacion","info_horario","contacto"],
  tipo_empanada:          ["emp_carne","emp_pollo","emp_ambas"],
  cantidad:               ["cant_1","cant_3","cant_6","cant_12","cant_custom"],
  entrega:                ["entrega_domicilio","entrega_tienda"],
  pago:                   ["pago_efectivo","pago_tarjeta"],
  factura:                ["factura_si","factura_no"],
  calificar_tiempo:       ["cal_5","cal_4","cal_3","cal_2","cal_1"],
  calificar_producto:     ["cal_5","cal_4","cal_3","cal_2","cal_1"],
  datos_fiscales_regimen: ["605","612","621","606","616","625","626","601","616"],
}

function resolveNumeric(step, text) {
  const n = parseInt(text)
  if (!isNaN(n) && NUMERIC_MAPS[step]) return NUMERIC_MAPS[step][n - 1] || text
  return text
}

module.exports = { MENUS, NUMERIC_MAPS, resolveNumeric, sendMenu }