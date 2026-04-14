/**
 * bot.js — Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * Cambios sobre la versión anterior:
 *  · Servidor Express embebido (webhook Stripe, redirecciones de pago,
 *    descarga de facturas PDF/XML) — todo en un solo proceso
 *  · case "confirmar" usa db.crearPedidoConPago() → link Stripe real
 *  · Factura SAT generada automáticamente si el pago con tarjeta se confirma
 * ─────────────────────────────────────────────────────────────────
 */

require("dotenv").config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys")
const qrcode   = require("qrcode-terminal")
const express  = require("express")
const { textToSpeech, transcribeAudio, wavToOgg, NO_AI_MODE } = require("./gemini")
const db       = require("./clienterepo")   // ← tu archivo original (sin cambiar)
const stripe   = require("./stripe")        // ← nuevo
const factura  = require("./facturacion")   // ← nuevo
const notif = require("./notificaciones")

// ══════════════════════════════════════════════════════════════
//  SERVIDOR EXPRESS (webhook Stripe + redirecciones de pago)
//  Se inicia junto con el bot en el mismo proceso
// ══════════════════════════════════════════════════════════════
const app  = express()
const PORT = process.env.PORT || 3000

// ── IMPORTANTE: webhook Stripe necesita body RAW (antes del json parser)
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"]
    try {
      const result = await stripe.manejarWebhook(req.body, sig)
      console.log("🔔 Webhook Stripe:", result.evento)
      res.json({ received: true })
    } catch (err) {
      console.error("❌ Webhook error:", err.message)
      res.status(400).json({ error: err.message })
    }
  }
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Redirect después de pago exitoso ────────────────────────────
app.get("/pago/exito", async (req, res) => {
  const { session_id, pedido } = req.query
  if (!session_id) return res.status(400).send("Falta session_id")

  try {
    const resultado = await stripe.confirmarPago(session_id)
    let facturaHtml = ""

    if (resultado.ok) {
      const pedidoId = resultado.pedidoId || parseInt(pedido)

      // Generar factura automáticamente si el pedido la requiere
      try {
        const det = await db.getDetallePedido(pedidoId)
        if (det?.pedido?.requiere_factura && det?.pedido?.dato_fiscal_id && !det?.pedido?.qr_generado) {
          const f = await factura.generarFactura(pedidoId)
          facturaHtml = `
            <hr style="margin:20px 0">
            <p><strong>🧾 Factura generada</strong></p>
            <p style="font-family:monospace;font-size:12px;background:#f5f5f5;padding:8px;border-radius:6px">
              UUID: ${f.uuid}
            </p>
            <p>
              <a href="/factura/${pedidoId}/pdf" style="margin-right:12px">📄 Descargar PDF</a>
              <a href="/factura/${pedidoId}/xml">🗂 Descargar XML</a>
            </p>`
        }
      } catch (fe) {
        console.warn("⚠️ Factura automática:", fe.message)
      }

      return res.send(`<!DOCTYPE html><html lang="es"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>¡Pago exitoso! — Empanadas Sumercé</title>
        <style>
          body{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#fff8f0}
          .card{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;
                padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.1)}
          h1{color:#e65c00} p{color:#555;line-height:1.6}
        </style></head><body>
        <div class="card">
          <div style="font-size:64px">✅</div>
          <h1>¡Pago confirmado!</h1>
          <p>¡Gracias parcero! Su pedido #${resultado.pedidoId} ya está en preparación. 🇨🇴🥟</p>
          <p>Le avisamos por WhatsApp cuando esté listo.</p>
          ${facturaHtml}
        </div></body></html>`)
    }

    res.send(`<h2>Pago pendiente</h2><p>Estado: ${resultado.estado}. Si ya pagó revise su WhatsApp en unos minutos.</p>`)
  } catch (err) {
    console.error("❌ Error confirmando pago:", err.message)
    res.status(500).send(`<h2>Error</h2><p>${err.message}</p><p>Contáctenos por WhatsApp.</p>`)
  }
})

app.get("/pago/checkout", (req, res) => {
  // Leer el HTML estático y servirlo directamente
  const htmlPath = path.join(__dirname, "pago_checkout.html")
 
  // Verificar que el archivo existe
  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send(
      `<h2>Error</h2><p>Archivo pago_checkout.html no encontrado.</p>` +
      `<p>Coloca el archivo en el mismo directorio que bot.js.</p>`
    )
  }
 
  // Verificar que el parámetro checkout_url es de Stripe (seguridad básica)
  const checkoutUrl = req.query.checkout_url || ""
  const esStripeUrl =
    checkoutUrl.startsWith("https://checkout.stripe.com/") ||
    checkoutUrl === ""  // vacío también se sirve (la página mostrará error propio)
 
  if (!esStripeUrl) {
    return res.status(400).send(
      `<h2>URL inválida</h2><p>El destino de pago no es válido.</p>`
    )
  }
 
  // Servir el HTML (los query params los lee el JS del frontend)
  res.sendFile(htmlPath)
})

// ── Redirect si el cliente cancela el pago ───────────────────────
app.get("/pago/cancelado", (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Cancelado — Empanadas Sumercé</title>
    <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#fff8f0}
    .card{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;
          box-shadow:0 4px 20px rgba(0,0,0,.1)}h1{color:#999}</style></head><body>
    <div class="card">
      <div style="font-size:64px">❌</div>
      <h1>Pago cancelado</h1>
      <p>No se realizó ningún cargo. Escríbanos por WhatsApp para intentar de nuevo.</p>
    </div></body></html>`)
})

// ── Descarga PDF de factura ──────────────────────────────────────
app.get("/factura/:pedidoId/pdf", async (req, res) => {
  const pedidoId = parseInt(req.params.pedidoId)
  try {
    const r = await db.query(
      `SELECT qr_codigo FROM Pedido WHERE pedido_id = @pid`, { pid: pedidoId }
    )
    const cfdiId = r.recordset[0]?.qr_codigo
    if (!cfdiId) return res.status(404).json({ error: "No hay factura para este pedido" })
    const buf = await factura.descargarPDF(cfdiId)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="factura-${pedidoId}.pdf"`)
    res.send(buf)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// ── Descarga XML de factura ──────────────────────────────────────
app.get("/factura/:pedidoId/xml", async (req, res) => {
  const pedidoId = parseInt(req.params.pedidoId)
  try {
    const r = await db.query(
      `SELECT qr_codigo FROM Pedido WHERE pedido_id = @pid`, { pid: pedidoId }
    )
    const cfdiId = r.recordset[0]?.qr_codigo
    if (!cfdiId) return res.status(404).json({ error: "No hay factura para este pedido" })
    const xml = await factura.descargarXML(cfdiId)
    res.setHeader("Content-Type", "application/xml")
    res.setHeader("Content-Disposition", `attachment; filename="cfdi-${pedidoId}.xml"`)
    res.send(xml)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// Arrancar Express
app.listen(PORT, () => {
  console.log(`🌐 Servidor Express en puerto ${PORT}`)
  console.log(`   POST /webhook/stripe`)
  console.log(`   GET  /pago/exito | /pago/cancelado`)
  console.log(`   GET  /factura/:id/pdf | /factura/:id/xml`)
})

// ══════════════════════════════════════════════════════════════
//  FRASES COLOMBIANAS PRE-ESCRITAS POR STEP
// ══════════════════════════════════════════════════════════════
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
    "¡Bacano! Último dato para la factura: escríbame su razón social o nombre completo tal como está registrado ante el SAT.",
    "¡Ya casi listo con la factura! Solo me falta la razón social. Escríbamela tal cual aparece en el SAT y con eso terminamos.",
  ],
  confirmar_datos: [
    "¡Uy juepucha, ya casi está listo su pedido! Revise el resumen que le mandé y si todo está correcto escríbame SÍ para confirmar, o CANCELAR si quiere salir.",
    "¡Eso es parcero, ya tenemos todo! Revise el resumen del pedido, que ahí está todo lo que me dijo. Si está bien escríbame SÍ, si hay algo mal dígame CANCELAR.",
    "¡Qué chimba, ya completamos todos los pasos! Revise el resumen con todo su pedido. Si está correcto escríbame SÍ, si no escríbame CANCELAR y arrancamos de nuevo.",
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

// ══════════════════════════════════════════════════════════════
//  TEXTOS GUÍA CORTOS
// ══════════════════════════════════════════════════════════════
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
    const t = { emp_carne:"carne 🥩", emp_pollo:"pollo 🍗", emp_ambas:"mixta 🍽️" }
    return `¡Excelente elección, de ${t[tipo]||tipo}! 👌\nAhora dígame *¿cuántas empanadas?* Seleccione del menú o escriba el número directamente 👇`
  },
  pedir_entrega: (cant) =>
    `¡Uy qué chimba, *${cant} empanada${cant>1?"s":""}*! 🔥\nAhora dígame: ¿cómo le llevo su pedido? Escríbame el *número* de la opción 👇`,
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
    }
    return `¡Uy juepucha, no le entendí! 😅\nPor favor ${hints[step]||"escribe el número de tu opción"}. Mire el menú de abajo 👇`
  },
}

// ══════════════════════════════════════════════════════════════
//  SESIONES
// ══════════════════════════════════════════════════════════════
const sessions = new Map()

async function getSession(jid) {
  if (!sessions.has(jid)) {
    try {
      const s = await db.getSesion(jid)
      sessions.set(jid, { step: s.step, data: s.datos || {} })
    } catch {
      sessions.set(jid, { step: "inicio", data: {} })
    }
  }
  return sessions.get(jid)
}

async function resetSession(jid) {
  sessions.set(jid, { step: "inicio", data: {} })
  try { await db.guardarSesion(jid, "inicio", {}) } catch {}
}

async function saveSession(jid, session) {
  sessions.set(jid, session)
  db.guardarSesion(jid, session.step, session.data).catch(() => {})
}

// ══════════════════════════════════════════════════════════════
//  HELPERS DE ENVÍO
// ══════════════════════════════════════════════════════════════
async function sendText(sock, jid, text) {
  await sock.sendMessage(jid, { text })
}

async function sendAudio(sock, jid, fraseKey, textGuia, menuFn) {
  // Siempre enviamos el texto guía primero
  if (textGuia) await sendText(sock, jid, textGuia)
 
  // Sin IA: no intentamos generar audio, solo enviamos el menú si hay
  if (NO_AI_MODE) {
    console.log(`🚫 [NO_AI_MODE] Audio omitido para step "${fraseKey}"`)
    if (menuFn) await menuFn()
    return
  }
 
  // Con IA: generamos la frase colombiana y el audio en background
  const textoAudio = frase(fraseKey)
  console.log(`🎙️ [${fraseKey}] → "${textoAudio.slice(0, 60)}..."`)
 
  ;(async () => {
    try {
      const wavBuf = await textToSpeech(textoAudio)
      // textToSpeech puede retornar null si el modo cambia en runtime
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

// ══════════════════════════════════════════════════════════════
//  MENÚS
// ══════════════════════════════════════════════════════════════
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
        { title: "3. Mis pedidos",  description: "Ver historial" },
        { title: "4. Mis datos",    description: "Ver mis datos guardados" },
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
  calificacion: (sock, jid, tipo) => sendMenu(sock, jid, {
    title: tipo === "tiempo" ? "¿Cómo estuvo la entrega? ⏱️" : "¿Qué tal la comida? 🥟",
    body:  "Califica del 1 al 5:",
    sections: [{ title: "Calificación", rows: [
      { title: "1. Excelente ⭐⭐⭐⭐⭐" },
      { title: "2. Muy bien ⭐⭐⭐⭐"   },
      { title: "3. Regular  ⭐⭐⭐"     },
      { title: "4. Malo     ⭐⭐"       },
      { title: "5. Pésimo   ⭐"         },
    ]}],
  }),
}

// ══════════════════════════════════════════════════════════════
//  RESUMEN DEL PEDIDO
// ══════════════════════════════════════════════════════════════
function buildResumen(data) {
  const tipoMap    = { emp_carne:"Carne 🥩", emp_pollo:"Pollo 🍗", emp_ambas:"Mixta 🍽️" }
  const entregaMap = { entrega_domicilio:"A domicilio 🏠", entrega_tienda:"En tienda 🏪" }
  const pagoMap    = { pago_efectivo:"Efectivo 💵", pago_tarjeta:"Tarjeta 💳" }
  const subtotal   = (data.cantidad || 0) * 25
  let r = `📋 *Resumen de tu pedido:*\n`
  r += `• 👤 Cliente: ${data.nombre || "Sin nombre"}\n`
  r += `• 🥟 Empanada: ${tipoMap[data.tipo] || data.tipo || "—"}\n`
  r += `• 🔢 Cantidad: ${data.cantidad || "—"}\n`
  r += `• 💰 Subtotal: $${subtotal} MXN\n`
  r += `• 🚚 Entrega: ${entregaMap[data.entrega] || data.entrega || "—"}\n`
  if (data.direccion) r += `• 📍 Dirección: ${data.direccion}\n`
  r += `• 💳 Pago: ${pagoMap[data.pago] || data.pago || "—"}\n`
  r += `• 🧾 Factura: ${data.factura === "factura_si" ? "Sí ✅" : "No ❌"}\n`
  if (data.rfc) r += `• RFC: ${data.rfc} — ${data.razonSocial}\n`
  return r
}

// ══════════════════════════════════════════════════════════════
//  MANEJADOR PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid

  const isAudio = !!(msg.message?.audioMessage || msg.message?.pttMessage)
  const rawText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.message?.buttonsResponseMessage?.selectedButtonId || ""

  const text = rawText.trim().toLowerCase()
  console.log(`[${jid}] step=${(await getSession(jid)).step} | texto="${text}" | audio=${isAudio}`)

  try { await db.upsertCliente({ whatsapp: jid }) } catch {}

  const session = await getSession(jid)

  // ── Audio entrante ───────────────────────────────────────────
  if (isAudio) {
    try {
      await sendText(sock, jid, "🎙️ _Escuchando..._")
      const buf  = await downloadMediaMessage(msg, "buffer", {})
      const mime = msg.message?.audioMessage?.mimetype ||
                   msg.message?.pttMessage?.mimetype   ||
                   "audio/ogg; codecs=opus"
      const transcripcion = await transcribeAudio(buf, mime)
      console.log(`📝 Transcripción: "${transcripcion}"`)
      return handleMessage(sock, { ...msg, message: { conversation: transcripcion }, _isTranscribed: true })
    } catch (err) {
      console.error("❌ Error audio:", err.message)
      return sendText(sock, jid, `¡Ay juepucha, no le entendí el audio! 😅\nEscríbame el texto o el número de su opción.`)
    }
  }

  // ── Mapa numérico ────────────────────────────────────────────
  const numericMaps = {
    inicio:             ["orden_individual","orden_evento","mis_pedidos","mis_datos","info_productos","info_ubicacion","info_horario","contacto"],
    tipo_empanada:      ["emp_carne","emp_pollo","emp_ambas"],
    cantidad:           ["cant_1","cant_3","cant_6","cant_12","cant_custom"],
    entrega:            ["entrega_domicilio","entrega_tienda"],
    pago:               ["pago_efectivo","pago_tarjeta"],
    factura:            ["factura_si","factura_no"],
    calificar_tiempo:   ["cal_5","cal_4","cal_3","cal_2","cal_1"],
    calificar_producto: ["cal_5","cal_4","cal_3","cal_2","cal_1"],
  }

  const resolvedText = (() => {
    const n = parseInt(text)
    if (!isNaN(n) && numericMaps[session.step])
      return numericMaps[session.step][n - 1] || text
    return text
  })()

  // ── Palabras clave globales ──────────────────────────────────
  const esHola = ["menu","menú","inicio","hola","buenas","hey","ey","start","empezar"].some(k => text.includes(k))
  if (esHola) {
    await resetSession(jid)
    await db.log("INFO","bot_whatsapp","menu_principal",{ whatsapp: jid })
    return sendAudio(sock, jid, "bienvenida", GUIAS.bienvenida(), () => MENUS.principal(sock, jid))
  }

  if (["cancelar","cancel","salir"].includes(text)) {
    await resetSession(jid)
    return sendText(sock, jid, `❌ Pedido cancelado parcero. Escribe *menú* cuando quieras volver, ¡a la orden!`)
  }

  // ── Máquina de estados ───────────────────────────────────────
  switch (session.step) {

    case "inicio": {
      if (resolvedText === "orden_individual") {
        const cap = await db.verificarCapacidadHoy().catch(() => ({ aceptaPedidos: true }))
        if (!cap.aceptaPedidos) {
          return sendText(sock, jid,
            `😔 ¡Ay parcero, lo sentimos mucho! Por hoy ya no aceptamos más pedidos.\n` +
            (cap.motivoCierre ? `_Motivo: ${cap.motivoCierre}_\n` : "") +
            `\nEscribe *menú* mañana o llámenos al +52 656 XXX XXXX.`)
        }
        const cliente = await db.getCliente(jid).catch(() => null)
        if (!cliente?.nombre) {
          session.step = "registro_nombre"
          session.data.tipoOrden = "individual"
          await saveSession(jid, session)
          return sendAudio(sock, jid, "pedir_nombre", GUIAS.pedir_nombre())
        }
        session.step = "tipo_empanada"
        session.data.tipoOrden = "individual"
        session.data.nombre = cliente.nombre
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_empanada", GUIAS.pedir_empanada(), () => MENUS.tipoEmpanada(sock, jid))

      } else if (resolvedText === "orden_evento") {
        const cliente = await db.getCliente(jid).catch(() => null)
        if (!cliente?.nombre) {
          session.step = "registro_nombre"
          session.data.tipoOrden = "evento"
          await saveSession(jid, session)
          return sendAudio(sock, jid, "pedir_nombre", GUIAS.pedir_nombre())
        }
        session.step = "evento_cantidad"
        session.data.nombre = cliente.nombre
        await saveSession(jid, session)
        return sendAudio(sock, jid, "evento",
          `🎉 *¡Cotización para evento!*\n¿Cuántas empanadas necesitas aproximadamente?\nEscribe el número directamente:`)

      } else if (resolvedText === "mis_pedidos") {
        const pedidos = await db.getHistorialPedidos(jid, 5).catch(() => [])
        if (!pedidos.length) return sendText(sock, jid, `📦 Aún no tienes pedidos parcero.\nEscribe *menú* para continuar.`)
        let msg = "📦 *Tus últimos pedidos:*\n\n"
        for (const p of pedidos) {
          msg += `*${p.folio}* — ${p.estado_pedido} — $${p.total} MXN\n`
          msg += `  ${p.productos || "—"}\n`
          msg += `  ${new Date(p.fecha_pedido).toLocaleDateString("es-MX")}\n\n`
        }
        return sendText(sock, jid, msg + "Escribe *menú* para volver.")

      } else if (resolvedText === "mis_datos") {
        const cliente = await db.getCliente(jid).catch(() => null)
        const dirs = await db.getDirecciones(jid).catch(() => [])
        let msg = `👤 *Tus datos registrados:*\n\n• WhatsApp: ${jid}\n`
        if (cliente?.nombre) msg += `• Nombre: ${cliente.nombre} ${cliente.apellidos || ""}\n`
        if (cliente?.email)  msg += `• Email: ${cliente.email}\n`
        msg += `• Pedidos realizados: ${cliente?.total_pedidos || 0}\n`
        msg += `• Total gastado: $${cliente?.total_gastado || 0} MXN\n`
        if (dirs.length) {
          msg += `\n📍 *Direcciones guardadas:*\n`
          for (const d of dirs) msg += `  - ${d.alias || "Sin alias"}: ${d.calle} ${d.numero_exterior || ""}, ${d.colonia || ""}\n`
        }
        return sendText(sock, jid, msg + "\nEscribe *menú* para volver.")

      } else if (resolvedText === "info_productos") {
        return sendText(sock, jid,
          `🍽️ *Nuestros productos:*\n\n🥩 Empanada de carne — $25 MXN\n🍗 Empanada de pollo — $25 MXN\n\n` +
          `📦 *Paquetes:*\n• 3 → $70 MXN\n• 6 → $135 MXN\n• 12 → $260 MXN\n\n` +
          `🎁 *Primera compra:* ¡Lleva 2 y te regalamos 1!\n\nEscribe *menú* para volver.`)
      } else if (resolvedText === "info_ubicacion") {
        return sendText(sock, jid, `📍 *Dónde estamos:*\nCalle Ejemplo #123, Col. Centro\nCiudad Juárez, Chihuahua\n\nEscribe *menú*.`)
      } else if (resolvedText === "info_horario") {
        return sendText(sock, jid, `🕐 *Horario:*\nLun–Vie: 10:00–20:00\nSáb: 10:00–18:00\nDom: Cerrado 😴\n\nEscribe *menú*.`)
      } else if (resolvedText === "contacto") {
        return sendText(sock, jid, `📞 Escribe tu duda y un humano te responderá.\nTel: *+52 656 XXX XXXX*\n\nEscribe *menú* para volver.`)
      } else {
        return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("inicio"), () => MENUS.principal(sock, jid))
      }
    }

    case "registro_nombre": {
      const nombreInput = rawText.trim()
      if (nombreInput.length < 2 || /^\d+$/.test(nombreInput)) {
        return sendText(sock, jid, `¡Ay parcero, eso no parece un nombre! 😅\nEscríbame su nombre completo, ej: _María García_`)
      }
      const partes    = nombreInput.split(" ").filter(Boolean)
      const nombre    = partes[0]
      const apellidos = partes.slice(1).join(" ") || null
      try {
        await db.upsertCliente({ whatsapp: jid, nombre, apellidos })
        await db.log("INFO","bot_whatsapp","cliente_registrado",{ whatsapp: jid, detalle: { nombre, apellidos } })
      } catch (err) { console.error("Error registrando nombre:", err.message) }
      session.data.nombre = nombre
      const tipoOrden = session.data.tipoOrden || "individual"
      if (tipoOrden === "evento") {
        session.step = "evento_cantidad"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "datos_cliente_confirmacion",
          `¡Listo *${nombre}*! 👍\n¿Cuántas empanadas necesitas para el evento?\nEscribe el número aproximado:`)
      }
      session.step = "tipo_empanada"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "nombre_registrado", GUIAS.nombre_registrado(nombre), () => MENUS.tipoEmpanada(sock, jid))
    }

    case "tipo_empanada": {
      if (["emp_carne","emp_pollo","emp_ambas"].includes(resolvedText)) {
        session.data.tipo = resolvedText
        session.step = "cantidad"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_cantidad", GUIAS.pedir_cantidad(resolvedText), () => MENUS.cantidad(sock, jid))
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("tipo_empanada"), () => MENUS.tipoEmpanada(sock, jid))
    }

    case "cantidad": {
      const cantMap = { cant_1:1, cant_3:3, cant_6:6, cant_12:12 }
      if (resolvedText === "cant_custom") {
        session.step = "cantidad_custom"
        await saveSession(jid, session)
        return sendText(sock, jid, `✏️ ¡Listo parcero! Escríbame *exactamente cuántas empanadas* quiere (solo el número):`)
      } else if (cantMap[resolvedText]) {
        session.data.cantidad = cantMap[resolvedText]
        session.step = "entrega"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_entrega", GUIAS.pedir_entrega(cantMap[resolvedText]), () => MENUS.entrega(sock, jid))
      } else if (!isNaN(parseInt(text)) && parseInt(text) > 0) {
        session.data.cantidad = parseInt(text)
        session.step = "entrega"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_entrega", GUIAS.pedir_entrega(parseInt(text)), () => MENUS.entrega(sock, jid))
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("cantidad"), () => MENUS.cantidad(sock, jid))
    }

    case "cantidad_custom": {
      const n = parseInt(text)
      if (!isNaN(n) && n > 0) {
        session.data.cantidad = n
        session.step = "entrega"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_entrega", GUIAS.pedir_entrega(n), () => MENUS.entrega(sock, jid))
      }
      return sendText(sock, jid, `¡Uy juepucha! Escriba *solo el número* de empanadas que quiere, ej: *5*`)
    }

    case "evento_cantidad": {
      const n = parseInt(text)
      if (!isNaN(n) && n > 0) {
        try {
          await db.query(
            `INSERT INTO CotizacionEvento (whatsapp, cantidad_estimada, estado) VALUES (@wa, @cant, 'pendiente')`,
            { wa: jid, cant: n }
          )
          await db.query(
            `INSERT INTO Alerta (tipo, mensaje) VALUES ('cotizacion_evento', @msg)`,
            { msg: `Cotización evento: ${session.data.nombre || jid} — ${n} empanadas` }
          )
        } catch (err) { console.error("Error cotización:", err.message) }
        await resetSession(jid)
        return sendText(sock, jid,
          `🎉 *¡Solicitud de evento registrada!*\n\n• Nombre: ${session.data.nombre || "—"}\n• Cantidad aproximada: ${n} empanadas\n\n` +
          `¡Un asesor de Sumercé le contactará pronto con la cotización, parcero!\n\nEscribe *menú* para volver.`)
      }
      return sendText(sock, jid, `¡Ay parcero! Escriba *solo el número* de empanadas que necesita para el evento, ej: *100*`)
    }

    case "entrega": {
      if (resolvedText === "entrega_domicilio") {
        session.data.entrega = resolvedText
        session.step = "direccion"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_direccion", GUIAS.pedir_direccion())
      } else if (resolvedText === "entrega_tienda") {
        session.data.entrega = resolvedText
        session.step = "pago"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_pago",
          `🏪 ¡Perfecto, pasa por las empanadas a la tienda!\n\n` + GUIAS.pedir_pago(),
          () => MENUS.pago(sock, jid))
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("entrega"), () => MENUS.entrega(sock, jid))
    }

    case "direccion": {
      let dirTxt = null, lat = null, lng = null
      if (msg.message?.locationMessage) {
        lat = msg.message.locationMessage.degreesLatitude
        lng = msg.message.locationMessage.degreesLongitude
        dirTxt = `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
      } else if (text.length > 5) {
        dirTxt = rawText.trim()
      } else {
        return sendText(sock, jid, `¡Ay parcero! Escríbame su dirección completa (calle, número, colonia) o comparta su 📍 ubicación de WhatsApp.`)
      }
      try {
        const dirId = await db.agregarDireccion(jid, { alias:"Entrega", calle:dirTxt, latitud:lat, longitud:lng })
        session.data.direccionId = dirId
      } catch {}
      session.data.direccion = dirTxt
      session.step = "pago"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "pedir_pago",
        GUIAS.direccion_ok(dirTxt) + "\n" + GUIAS.pedir_pago(),
        () => MENUS.pago(sock, jid))
    }

    case "pago": {
      if (["pago_efectivo","pago_tarjeta"].includes(resolvedText)) {
        session.data.pago = resolvedText
        session.step = "factura"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_factura", GUIAS.pedir_factura(), () => MENUS.factura(sock, jid))
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("pago"), () => MENUS.pago(sock, jid))
    }

    case "factura": {
      if (resolvedText === "factura_si") {
        session.data.factura = resolvedText
        const df = await db.getDatoFiscal(jid).catch(() => null)
        if (df) {
          session.data.datoFiscalId = df.dato_fiscal_id
          session.data.rfc          = df.rfc
          session.data.razonSocial  = df.razon_social
          session.step = "confirmar_datos"
          await saveSession(jid, session)
          return sendAudio(sock, jid, "confirmar_datos",
            `🧾 Datos fiscales guardados:\n• RFC: ${df.rfc}\n• Razón social: ${df.razon_social}\n\n` +
            buildResumen(session.data) + `\n¿Confirma su pedido? Escribe *SÍ* o *CANCELAR*:`)
        }
        session.step = "datos_fiscales_rfc"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_rfc", GUIAS.pedir_rfc())
      } else if (resolvedText === "factura_no") {
        session.data.factura = resolvedText
        session.step = "confirmar_datos"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "confirmar_datos", GUIAS.confirmar(buildResumen(session.data)))
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("factura"), () => MENUS.factura(sock, jid))
    }

    case "datos_fiscales_rfc": {
      const rfcInput = rawText.trim().toUpperCase()
      if (rfcInput.length >= 12 && rfcInput.length <= 13 && /^[A-Z0-9]+$/.test(rfcInput)) {
        session.data.rfc = rfcInput
        session.step = "datos_fiscales_razon"
        await saveSession(jid, session)
        return sendAudio(sock, jid, "pedir_razon_social", GUIAS.pedir_razon())
      }
      return sendText(sock, jid,
        `¡Uy parcero, ese RFC no parece válido! 😅\nDebe tener 12 o 13 caracteres alfanuméricos.\nEscríbalo de nuevo por favor:`)
    }

    case "datos_fiscales_razon": {
      session.data.razonSocial = rawText.trim()
      try {
        const dfId = await db.guardarDatoFiscal(jid, {
          rfc:         session.data.rfc,
          razonSocial: session.data.razonSocial,
        })
        session.data.datoFiscalId = dfId
      } catch (err) { console.error("Error dato fiscal:", err.message) }
      session.step = "confirmar_datos"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "confirmar_datos",
        GUIAS.confirmar(buildResumen(session.data) + `\n🧾 Factura a: ${session.data.razonSocial} (RFC: ${session.data.rfc})`))
    }

    case "confirmar_datos": {
      const palabrasSi = ["sí","si","yes","confirmar","confirmo","dale","listo","va","ok","correcto","todo bien","así es"]
      if (palabrasSi.some(k => text.includes(k))) {
        session.step = "confirmar"
        await saveSession(jid, session)
        return handleMessage(sock, { ...msg, message: { conversation: "si" } })
      }
      if (text.includes("cancel") || text.includes("no") || text.includes("mal")) {
        await resetSession(jid)
        return sendText(sock, jid, `❌ ¡Listo parcero, cancelado sin problema!\nEscribe *menú* cuando quieras arrancar de nuevo. ¡A la orden!`)
      }
      return sendText(sock, jid,
        `¡Uy parcero, no le entendí! 😅\nEscribe *SÍ* para confirmar su pedido o *CANCELAR* para salir:\n\n` +
        buildResumen(session.data))
    }

    // ── CONFIRMAR: crea el pedido y genera link Stripe si aplica ──
    case "confirmar": {
      const palabrasSi = ["sí","si","yes","confirmar","confirmo","dale","listo","va","ok"]
      if (palabrasSi.some(k => text.includes(k))) {

        const productoMap = { emp_carne:1, emp_pollo:2 }
        const items = []
        if (session.data.tipo === "emp_ambas") {
          const mitad = Math.ceil((session.data.cantidad||1) / 2)
          const resto = Math.floor((session.data.cantidad||1) / 2)
          if (mitad > 0) items.push({ productoId:1, cantidad:mitad })
          if (resto > 0) items.push({ productoId:2, cantidad:resto })
        } else {
          items.push({ productoId: productoMap[session.data.tipo] || 1, cantidad: session.data.cantidad || 1 })
        }

        const metodoPagoId = session.data.pago === "pago_efectivo" ? 1 : 2

        try {
          // ── Crear pedido en BD ───────────────────────────────
          const resultado = await db.crearPedido({
            whatsapp:        jid,
            tipoPedido:      "individual",
            tipoEntrega:     session.data.entrega === "entrega_domicilio" ? "domicilio" : "tienda",
            direccionId:     session.data.direccionId  || null,
            metodoPagoId,
            requiereFactura: session.data.factura === "factura_si",
            datoFiscalId:    session.data.datoFiscalId || null,
            canal:           "whatsapp",
          }, items)

          // ── Construir mensaje de confirmación ────────────────
          let confirmMsg =
            `✅ *¡Pedido confirmado, parcero!* 🎉🇨🇴\n\n` +
            `*Folio:* ${resultado.folio}\n` +
            `*Código de entrega:* \`${resultado.codigoEntrega}\`\n` +
            `_(Guárdelo, lo necesitará al recibir su pedido)_\n\n` +
            buildResumen(session.data) +
            `\n💰 *Total: $${resultado.total} MXN*`

          if (resultado.descuento > 0)
            confirmMsg += `\n🎁 *Descuento primera compra: -$${resultado.descuento} MXN*\n¡Qué chimba, bienvenido!`

          // ── Si paga con tarjeta: generar link Stripe real ────
          if (metodoPagoId !== 1) {
            try {
              const descripcion = items.map(i => `${i.cantidad}x Empanada`).join(", ")
              const pago = await stripe.crearLinkPago({
                pedidoId:    resultado.pedidoId,
                folio:       resultado.folio,
                monto:       Number(resultado.total),
                metodoPagoId,
                whatsapp:    jid,
                descripcion,
              })
              confirmMsg +=
                `\n\n💳 *Link de pago (Stripe):*\n${pago.checkoutUrl}\n` +
                `_(Válido por 30 minutos — paga de forma segura)_`
            } catch (stripeErr) {
              console.error("❌ Stripe crearLinkPago:", stripeErr.message)
              confirmMsg += `\n\n💳 _Hubo un problema generando el link de pago. Le contactamos por aquí._`
            }
          }

          confirmMsg += `\n\n¡Muchas gracias ${session.data.nombre || "parcero"}! Sus empanadas ya están en preparación 🥟🔥\nEscribe *menú* para hacer otro pedido.`

          await db.log("INFO","bot_whatsapp","pedido_confirmado",{
            whatsapp: jid, pedidoId: resultado.pedidoId,
            detalle: { folio: resultado.folio, total: resultado.total },
          })

          await sendAudio(sock, jid, "pedido_confirmado", confirmMsg)
          await resetSession(jid)

        } catch (err) {
          console.error("❌ Error creando pedido en BD:", err.message)
          await db.log("ERROR","bot_whatsapp","error_crear_pedido",{ whatsapp: jid, detalle: err.message })
          return sendText(sock, jid,
            `😔 ¡Ay juepucha, hubo un error al procesar el pedido!\nPor favor intente de nuevo o escribe *cancelar*.\n_Error: ${err.message}_`)
        }

      } else if (text.includes("cancel") || text.includes("no")) {
        await resetSession(jid)
        return sendText(sock, jid, `❌ Pedido cancelado. Escribe *menú* cuando quieras, ¡a la orden!`)
      } else {
        session.step = "confirmar_datos"
        await saveSession(jid, session)
        return sendText(sock, jid,
          `Escribe *SÍ* para confirmar o *CANCELAR* para salir:\n\n` + buildResumen(session.data))
      }
      break
    }

    case "calificar_tiempo": {
      const calMap = { cal_5:5, cal_4:4, cal_3:3, cal_2:2, cal_1:1 }
      const cal = calMap[resolvedText] || parseInt(text)
      if (cal >= 1 && cal <= 5) {
        try { await db.guardarCalificacionEntrega(session.data.pedidoId, cal) } catch {}
        session.step = "inicio"
        await saveSession(jid, session)
        return sendText(sock, jid,
          `⭐ ¡Gracias por su calificación de entrega (${cal}/5), parcero!\nMañana le preguntamos por la comida 😋\nEscribe *menú* para volver.`)
      }
      return MENUS.calificacion(sock, jid, "tiempo")
    }

    case "calificar_producto": {
      const calMap = { cal_5:5, cal_4:4, cal_3:3, cal_2:2, cal_1:1 }
      const cal = calMap[resolvedText] || parseInt(text)
      if (cal >= 1 && cal <= 5) {
        try {
          await db.guardarCalificacionProducto(session.data.pedidoId, cal)
          await db.marcarOpinionSolicitada(session.data.pedidoId)
        } catch {}
        session.step = "inicio"
        await saveSession(jid, session)
        return sendText(sock, jid, cal >= 4
          ? `⭐ ¡Qué chimba que le gustaron! (${cal}/5) 🇨🇴🥟\n¡Gracias parcero! Escribe *menú* cuando quiera pedir de nuevo.`
          : `⭐ Gracias por su honestidad (${cal}/5). ¡Trabajaremos para mejorar, berraco! 💪\nEscribe *menú* para volver.`)
      }
      return MENUS.calificacion(sock, jid, "producto")
    }
     
    case "pago_fallido_opciones": {
      // El cliente recibió el mensaje de pago fallido y elige:
      //   1 → cambiar a efectivo
      //   2 → cancelar pedido
 
      const pedidoData = session.data   // { pedidoId, folio, total }
 
      if (text === "1" || text.includes("efectivo")) {
        // Cambiar el método de pago a efectivo en la BD
        try {
          await db.query(
            `UPDATE Pedido
             SET metodo_pago_id = 1,
                 estado_pago    = 'pendiente',
                 estado_pedido  = 'recibido'
             WHERE pedido_id = @pid`,
            { pid: pedidoData.pedidoId }
          )
          await db.log("INFO", "bot_whatsapp", "cambio_pago_efectivo", {
            whatsapp: jid,
            pedidoId: pedidoData.pedidoId,
            detalle:  "Cliente cambió a efectivo tras fallo de tarjeta",
          })
        } catch (err) {
          console.error("❌ Error cambiando método de pago:", err.message)
        }
 
        await resetSession(jid)
        return sendText(sock, jid,
          `✅ *¡Listo parcero!* Cambiamos tu pedido *${pedidoData.folio}* a pago en efectivo. 💵\n\n` +
          `💰 Total a pagar al recibir: *$${Number(pedidoData.total).toFixed(2)} MXN*\n\n` +
          `Recuerda tener el dinero exacto, ¡a la orden! 🇨🇴🥟\n\n` +
          `Escribe *menú* para hacer otro pedido.`
        )
 
      } else if (text === "2" || text.includes("cancel")) {
        // Cancelar el pedido
        try {
          await db.query(
            `UPDATE Pedido
             SET estado_pedido = 'cancelado',
                 estado_pago   = 'fallido'
             WHERE pedido_id = @pid`,
            { pid: pedidoData.pedidoId }
          )
          // Revertir el contador de pedidos del cliente
          await db.query(
            `UPDATE Cliente SET total_pedidos = total_pedidos - 1
             WHERE whatsapp = @wa AND total_pedidos > 0`,
            { wa: jid }
          )
          await db.log("INFO", "bot_whatsapp", "pedido_cancelado_por_pago_fallido", {
            whatsapp: jid,
            pedidoId: pedidoData.pedidoId,
          })
        } catch (err) {
          console.error("❌ Error cancelando pedido:", err.message)
        }
 
        await resetSession(jid)
        return sendText(sock, jid,
          `❌ *Pedido ${pedidoData.folio} cancelado.*\n\n` +
          `No hay ningún cobro, parcero. ¡La próxima vez será! 🇨🇴\n\n` +
          `Escribe *menú* cuando quieras pedir de nuevo. ¡A la orden!`
        )
 
      } else {
        // No entendió — repetir opciones
        return sendText(sock, jid,
          `¡Uy parcero, no le entendí! 😅\n\n` +
          `Escribe *1* para pagar en *efectivo* al recibir\n` +
          `Escribe *2* para *cancelar* el pedido\n\n` +
          `_Pedido: ${pedidoData.folio} — $${Number(pedidoData.total).toFixed(2)} MXN_`
        )
      }
    }
    default: {
      await resetSession(jid)
      return sendAudio(sock, jid, "bienvenida", GUIAS.bienvenida(), () => MENUS.principal(sock, jid))
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  CRON: Solicitar opiniones post-entrega
// ══════════════════════════════════════════════════════════════
async function solicitarOpinionesPendientes(sock) {
  try {
    const pendientes = await db.pedidosSinOpinion()
    for (const p of pendientes) {
      const session = await getSession(p.whatsapp)
      session.step = "calificar_producto"
      session.data.pedidoId = p.pedido_id
      await saveSession(p.whatsapp, session)
      await sendText(sock, p.whatsapp,
        `¡Ey ${p.nombre || "parcero"}! 👋🇨🇴\n¿Cómo estuvo su pedido *${p.folio}* de ayer?\n¡Dénos su opinión! 👇`)
      await MENUS.calificacion(sock, p.whatsapp, "producto")
      await db.marcarOpinionSolicitada(p.pedido_id)
    }
  } catch (err) { console.error("Error cron opiniones:", err.message) }
}

// ══════════════════════════════════════════════════════════════
//  ARRANQUE DEL BOT
// ══════════════════════════════════════════════════════════════
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()
  console.log("🚀 WA versión:", version)

  const sock = makeWASocket({
    version, auth: state, printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  })

  notif.setSock(sock)

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) { console.log("📱 Escanea el QR:"); qrcode.generate(qr, { small: true }) }
    if (connection === "open")  console.log("✅ Bot conectado a WhatsApp")
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) { console.log("🔄 Reconectando..."); startBot() }
      else console.log("🚪 Sesión cerrada. Borra auth/ y escanea de nuevo.")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    try { await handleMessage(sock, msg) }
    catch (err) { console.error("Error handleMessage:", err) }
  })

  setInterval(async () => {
    try { await db.limpiarSesionesViejas(); console.log("🧹 Sesiones limpiadas") } catch {}
  }, 24 * 60 * 60 * 1000)

  setInterval(() => solicitarOpinionesPendientes(sock), 60 * 60 * 1000)
}

startBot()