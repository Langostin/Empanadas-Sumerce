/**
 * src/bot/frases.js
 * Frases colombianas, textos guía y helpers de envío de mensajes.
 */
const { textToSpeech, wavToOgg, NO_AI_MODE } = require("../utils/gemini")

// ══════════════════════════════════════════════════════════════════
//  FRASES COLOMBIANAS PRE-ESCRITAS POR STEP
// ══════════════════════════════════════════════════════════════════
const FRASES = {
  bienvenida: [
    "¡Ey, qué más pues! Bienvenido a Empanadas Sumercé, la mejor empanada colombiana en toda Ciudad Juárez, ¡juepucha! Por favor revisa el menú que te mandé y escribe el número de lo que se le antoje, parcero.",
    "¡Ay, qué chimba que me escribió! Bienvenido mi amor, esto es Empanadas Sumercé, empanadas colombianas auténticas acá en Juárez. Dale un vistazo al menú y escríbeme el numerito de lo que quieras, ¿listo?",
    "¡Hola hola hola, parcero! Bienvenido a Empanadas Sumercé. Aquí le tenemos las mejores empanadas colombianas de este lado de la frontera, ¡berraco! Mire el menú y escríbame el número de su opción para arrancar.",
  ],
  pedir_nombre: [
    "¡Ay qué chimba que va a pedir! Pero antes de arrancar con su pedido, necesito saber cómo se llama pues. Escríbame su nombre completo para tenerlo en el sistema, mi amor.",
    "¡Uy juepucha! Es la primera vez que pide con nosotros, qué emoción. Para registrarlo bien en el sistema, ¿me escribe su nombre completo? Solo se lo pido esta vez, parcero.",
    "¡Bienvenido a su primera empanada con Sumercé! Para llevar todo bien en el sistema, escríbame su nombre completo, que esto es rapidito y no lo molesto más con eso.",
  ],
  nombre_registrado: [
    "¡Qué chimba, ya lo tengo registrado! Ahora sí, vamos con su pedido. Mire el menú de empanadas y escríbame el número del tipo que se le antoja, parcero.",
    "¡Listo pues, ya quedó en el sistema! Ahora sí arrancamos. Dele un ojo al menú y dígame qué tipo de empanada le provoca hoy.",
    "¡Bacano, ya lo tengo! Ahora sí le tomo el pedido. Revise el menú y escríbame el número de la empanada que se le antoja, que tenemos de carne y de pollo y están una berraquera.",
  ],
  pedir_empanada: [
    "¡Uy qué rico, va a pedir empanadas! Mire el menú parcero y dígame cuál se le antoja: si la de carne, la de pollo o la mixta. Escríbame el numerito.",
    "¡Ay juepucha, vamos a empezar con lo bueno! Revise el menú y dígame qué tipo de empanada le provoca. Tenemos de carne, de pollo y mixta, ¡todas una chimba!",
    "¡Bacano que va a pedir! Ahora dígame cuál empanada le antoja más. Mire las opciones del menú y escríbame el número correspondiente, parcero.",
  ],
  pedir_cantidad: [
    "¡Uy qué rico! Excelente elección mi amor. Ahora dígame cuántas empanadas va a querer, mire las opciones del menú o escríbame el número directamente.",
    "¡Esa es la vaina! Ahora lo importante: ¿cuántas empanaditas le mando? Revise las cantidades en el menú y dígame el número, o si quiere una cantidad diferente escríbala directamente.",
    "¡Juepucha qué buena elección! Listo, ya sé qué tipo quiere. Ahora dígame la cantidad: ¿cuántas empanadas le mando? Mire el menú o escriba el número directamente parcero.",
  ],
  pedir_entrega: [
    "¡Listo, ya tengo la cantidad! Ahora dígame cómo se las mando: ¿se las llevo a su casa o viene a recogerlas acá en la tienda? Escríbame el número del menú, parcero.",
    "¡Uy qué chimba, ya vamos avanzando! Dígame una cosa: ¿se las llevo a domicilio o va a pasar por ellas a la tienda? Revise las opciones y escríbame el número.",
    "¡Vamos muy bien parcero! Solo me falta saber cómo le entrego las empanadas. ¿A domicilio o recoge en tienda? Mire el menú y escríbame el numerito.",
  ],
  pedir_direccion: [
    "¡Uy chimba, a domicilio! Con mucho gusto le llevamos las empanadas. Escríbame su dirección completa: calle, número y colonia, o si quiere comparta su ubicación por WhatsApp directamente.",
    "¡Perfecto parcero, domicilio a la orden! Para llevarle las empanaditas, escríbame su dirección: calle, número exterior, colonia. O si prefiere, comparta su ubicación por acá.",
    "¡A domicilio, qué chimba! Mándeme su dirección completa para llevarle las empanadas bien rápido: calle, número y colonia. O comparta la ubicación por WhatsApp si prefiere esa vaina.",
  ],
  pedir_pago: [
    "¡Listo parcero, ya casi terminamos! Dígame cómo va a pagar: ¿efectivo cuando lleguen las empanadas o con tarjeta por un link seguro? Escríbame el número del menú.",
    "¡Vamos muy bien! Solo falta el pago. ¿Cómo va a cancelar: en efectivo o con tarjeta? Si es con tarjeta le mando un link de pago facilito. Escríbame el numerito.",
    "¡Casi listo, juepucha qué rápido! Dígame el método de pago: efectivo al recibir o tarjeta de crédito o débito. Mire el menú y escríbame el número.",
  ],
  pedir_factura: [
    "¡Listo con el pago! Una última pregunta parcero: ¿va a necesitar factura fiscal? Si necesita CFDI le pedimos sus datos del SAT, si no, le brincamos ese paso. Escríbame el número.",
    "¡Ya casi está todo listo! Solo dígame si necesita factura fiscal o no. Revise las opciones del menú y escríbame el número, que esto es el último paso antes de confirmar.",
    "¡Una preguntita más y listo! ¿Necesita factura? Si necesita su CFDI le pido los datos del SAT, si no, seguimos directo a confirmar el pedido. Escríbame la opción parcero.",
  ],
  pedir_rfc: [
    "¡Listo, le hacemos la factura! Para eso necesito su RFC, que son 12 o 13 caracteres. Escríbamelo por favor, lo ingresa en el chat normal.",
    "¡Con gusto le facturamos parcero! Escríbame su RFC, son 12 caracteres si es persona moral o 13 si es persona física.",
    "¡A la orden con la factura! Para procesarla necesito su RFC. Escríbamelo en el chat y yo lo registro en el sistema.",
  ],
  pedir_razon_social: [
    "¡Perfecto, ya tengo el RFC! Ahora escríbame su razón social o nombre completo exactamente como aparece en el SAT para que la factura quede bien.",
    "¡Bacano! Escríbame su razón social o nombre completo tal como está registrado ante el SAT.",
    "¡Ya casi listo con la factura! Solo me falta la razón social. Escríbamela tal cual aparece en el SAT y con eso terminamos.",
  ],
  confirmar_datos: [
    "¡Uy juepucha, ya casi está listo su pedido! Revise el resumen que le mandé y si todo está correcto escríbame SÍ para confirmar, o CANCELAR si quiere salir.",
    "¡Eso es parcero, ya tenemos todo! Revise el resumen del pedido. Si está bien escríbame SÍ, si hay algo mal dígame CANCELAR.",
    "¡Qué chimba, ya completamos todos los pasos! Si está correcto escríbame SÍ, si no escríbame CANCELAR y arrancamos de nuevo.",
  ],
  pedido_confirmado: [
    "¡Uy qué chimba, pedido confirmado parcero! Ya le mandé el folio y el código de entrega. Empezamos a preparar sus empanadas y pronto le avisamos. ¡Muchas gracias por su pedido!",
    "¡Juepucha que rápido! Pedido confirmado con todo. Ya arrancamos con sus empanadas. Guarde el código de entrega que le mandé, lo va a necesitar cuando llegue el repartidor.",
    "¡Listo pues, pedido confirmado! Las empanadas van quedando buenísimas. Le mandé el folio y el código, guárdelo. En poquito le avisamos cuando estén listas.",
  ],
  no_entendi: [
    "¡Ay juepucha, no le entendí lo que me escribió! Por favor escríbame el número de la opción del menú que le mandé, que así sí le entiendo parcero.",
    "¡Uy, perdón parcero pero no entendí eso! Revise el menú que le mandé y escríbame solo el número de la opción que quiere. Así le entiendo rapidito.",
    "¡Ay berraco, no capté lo que me dijo! No se me enoje, por favor escríbame el número de su opción del menú. Solo el número y con eso arrancamos.",
  ],
  evento: [
    "¡Uy qué chimba, un evento! Con mucho gusto le cotizamos. Dígame cuántas empanadas aproximadamente necesita para el evento y un asesor le contacta pronto con el precio.",
    "¡Bacano, para evento! Escriba el número aproximado de empanadas que necesita y un asesor de Sumercé le llama o escribe pronto con todos los detalles y el precio.",
    "¡Ay qué emoción, una cotización para evento! Dígame cuántas empanadas necesita aproximadamente y nosotros le damos el precio y coordinamos todo. ¡A la orden!",
  ],
  datos_cliente_confirmacion: [
    "¡Perfecto, ya tengo sus datos registrados! Ahora sí arrancamos con el pedido, que ya sé quién es el parcero que va a disfrutar las empanadas.",
    "¡Bacano, ya quedó registrado en el sistema! Ahora sí le tomo el pedido, que con gusto le atendemos desde hoy.",
    "¡Listo pues, ya lo tengo en el sistema! Ahora sí empezamos con su pedido. ¡A la orden parcero!",
  ],
}

function frase(key) {
  const pool = FRASES[key]
  if (!pool?.length) return ""
  return pool[Math.floor(Math.random() * pool.length)]
}

// ══════════════════════════════════════════════════════════════════
//  TEXTOS GUÍA
// ══════════════════════════════════════════════════════════════════
const GUIAS = {
  bienvenida: () =>
    `¡Ey, qué más parcero! 🇨🇴🥟\nBienvenido a *Empanadas Sumercé*.\nEscriba el número de lo que se le antoje del menú de abajo 👇`,
  pedir_nombre: () =>
    `¡Uy qué chimba que va a pedir! 😄\nAntes de arrancar, ¿me escribe su *nombre completo* por favor? Solo se lo pido esta vez.`,
  nombre_registrado: (nombre) =>
    `¡Bacano, ya lo tengo *${nombre}*! 👍\nAhora sí vamos con el pedido. Escríbame el *número* del tipo de empanada que se le antoja 👇`,
  pedir_empanada: () =>
    `¡Listo, arrancamos con el pedido! 🥟\nEscriba el *número* del tipo de empanada que quiere. Tenemos de carne, pollo y mixta 👇`,
  pedir_cantidad: (tipo) => {
    const t = { emp_carne: "carne 🥩", emp_pollo: "pollo 🍗", emp_ambas: "mixta 🍽️" }
    return `¡Excelente elección, de ${t[tipo] || tipo}! 👌\nAhora dígame *¿cuántas empanadas?* Seleccione del menú o escriba el número directamente 👇`
  },
  pedir_entrega: (cant) =>
    `¡Uy qué chimba, *${cant} empanada${cant > 1 ? "s" : ""}*! 🔥\nAhora dígame: ¿cómo le llevo su pedido? Escríbame el *número* de la opción 👇`,
  pedir_direccion: () =>
    `¡A domicilio parcero! 🏠\nEscríbame su *dirección completa* (calle, número, colonia) o comparta su 📍 *ubicación* por WhatsApp:`,
  direccion_ok: (dir) =>
    `✅ ¡Listo, dirección registrada!\n_${dir}_\n\nAhora dígame cómo va a pagar 👇`,
  pedir_pago: () =>
    `💳 Ya casi terminamos parcero!\nEscríbame el *número* del método de pago 👇`,
  pedir_factura: () =>
    `🧾 ¿Necesita *factura fiscal*?\nEscríbame el *número* de su respuesta 👇`,
  pedir_rfc: () =>
    `🧾 ¡Con gusto le facturamos!\nEscríbame su *RFC* (12 o 13 caracteres):`,
  pedir_razon: () =>
    `✅ ¡RFC registrado!\nAhora escríbame su *razón social* exactamente como aparece en el SAT:`,
  pedir_cp_fiscal: () =>
    `📮 ¡Casi listo con la factura!\nEscríbame el *código postal fiscal* (5 dígitos) que aparece en su constancia del SAT:`,
  pedir_regimen: () =>
    `🏛️ ¡Perfecto, ya tengo el CP!\nAhora seleccione su *régimen fiscal* del menú de abajo 👇`,
  confirmar: (resumen) =>
    `${resumen}\n¿Todo correcto parcero?\nEscriba *SÍ* para confirmar o *CANCELAR* para salir 👇`,
  no_entendi: (step) => {
    const hints = {
      inicio:       "escribe el *número* de la opción del menú (ej: *1* para pedir empanadas)",
      tipo_empanada:"escribe *1* para carne, *2* para pollo o *3* para mixta",
      cantidad:     "escribe el *número* de la opción o la cantidad directamente (ej: *4*)",
      entrega:      "escribe *1* para domicilio o *2* para recoger en tienda",
      pago:         "escribe *1* para efectivo o *2* para tarjeta",
      factura:      "escribe *1* si necesita factura o *2* si no",
      datos_fiscales_regimen: "escribe el *número* del régimen fiscal del menú de arriba",
    }
    return `¡Uy juepucha, no le entendí! 😅\nPor favor ${hints[step] || "escribe el número de tu opción"}. Mire el menú de abajo 👇`
  },
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS DE ENVÍO
// ══════════════════════════════════════════════════════════════════
async function sendText(sock, jid, text) {
  await sock.sendMessage(jid, { text })
}

async function sendAudio(sock, jid, fraseKey, textGuia, menuFn) {
  if (textGuia) await sendText(sock, jid, textGuia)

  if (NO_AI_MODE) {
    console.log(`🚫 [NO_AI_MODE] Audio omitido — "${fraseKey}"`)
    if (menuFn) await menuFn()
    return
  }

  const textoAudio = frase(fraseKey)
  console.log(`🎙️ [${fraseKey}] → "${textoAudio.slice(0, 60)}..."`)

  ;(async () => {
    try {
      const wavBuf = await textToSpeech(textoAudio)
      if (!wavBuf) return
      const oggBuf = await wavToOgg(wavBuf)
      await sock.sendMessage(jid, { audio: oggBuf, mimetype: "audio/ogg; codecs=opus", ptt: true })
    } catch (err) {
      console.error(`❌ Audio ${fraseKey}:`, err.message)
    }
  })()

  await new Promise(r => setTimeout(r, 300))
  if (menuFn) await menuFn()
}

module.exports = { FRASES, GUIAS, frase, sendText, sendAudio }