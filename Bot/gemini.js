/**
 * gemini.js  —  Empanadas Sumercé 🇨🇴
 * ─────────────────────────────────────────────────────────────────
 * Pipeline de IA:
 *   1. transcribeAudio()           → texto desde nota de voz
 *   2. analyzeAndRespond()         → respuesta colombiana + decisión de audio
 *   3. textToSpeech()              → WAV con voz Aoede
 *   4. wavToOgg()                  → OGG Opus para WhatsApp
 *   5. processWithAI()             → orquesta todo, devuelve { responseText, audioBuffer?, userInput, useAudio }
 * ─────────────────────────────────────────────────────────────────
 */

const https    = require("https")
const fs       = require("fs")
const path     = require("path")
const os       = require("os")
const { execFile } = require("child_process")

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDVwuXdbmMDR5WRzN877ZOkUKKRYzVsw3Y"
const MODEL_TEXT     = "gemini-2.0-flash"
const MODEL_TTS      = "gemini-2.5-flash-preview-tts"

// ─────────────────────────────────────────────
//  HELPER HTTP
// ─────────────────────────────────────────────
function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body)
    const urlObj  = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }
    const req = https.request(options, res => {
      let raw = ""
      res.on("data", c => raw += c)
      res.on("end", () => {
        try { resolve(JSON.parse(raw)) }
        catch { reject(new Error("JSON parse error: " + raw.slice(0, 200))) }
      })
    })
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

// ─────────────────────────────────────────────
//  PERSONALIDAD Y CONTEXTO DE MENÚS
// ─────────────────────────────────────────────
const PERSONA = `
Eres "Paisa", la vendedora virtual de Empanadas Sumercé en Ciudad Juárez, México.
Hablas exactamente como una mujer bogotana: cálida, pícara, expresiva, con modismos naturales.

MODISMOS que debes usar: "¡Qué chimba!", "parcero/a", "bacano", "chévere", "a la orden",
"¿Qué más?", "pilas", "listo pues", "hagámosle", "de una", "¡Uy juepucha!", "mija/mijo",
"mi amor", "berraco", "¡Épale!"

GROSERÍAS permitidas (tono cariñoso/gracioso): "jueputa", "hijueputa" — NUNCA agresivo.

REGLAS ESTRICTAS:
- Máximo 2 oraciones. Sé concreta, tu trabajo es tomar pedidos.
- NUNCA inventes productos. Solo hay empanadas de CARNE y de POLLO a $25 cada una.
- Si el cliente pide algo que no existe (chorizo, res, queso, etc.) corrígelo amablemente
  y redirígelo a las opciones reales del menú.
- NUNCA digas que sí a algo que no está en el menú.
- Siempre termina guiando hacia la acción concreta del paso actual.
- NO uses lenguaje violento, discriminatorio ni sexual.
`

// Contexto COMPLETO de cada paso: qué hay disponible y qué debe hacer el cliente
const MENU_CONTEXT = {
  inicio: {
    desc: "menú principal de bienvenida",
    opciones: [
      "1. Orden individual — comprar empanadas para sí mismo",
      "2. Pedido para evento — comprar en cantidad para un evento o fiesta (cotización)",
      "3. Mis pedidos anteriores — ver historial de compras",
      "4. Mis datos — ver información guardada",
      "5. Productos y precios — ver qué vendemos",
      "6. Dónde estamos — dirección de la tienda",
      "7. Horario — cuándo estamos abiertos",
      "8. Contacto / Soporte — hablar con una persona",
    ],
  },
  registro_nombre: {
    desc: "registro del cliente: pedirle su nombre para guardar en el sistema",
    opciones: ["El cliente debe escribir su nombre completo"],
  },
  tipo_empanada: {
    desc: "selección del tipo de empanada",
    opciones: [
      "1. De CARNE — rellena de carne molida sazonada — $25 MXN",
      "2. De POLLO — rellena de pollo desmechado — $25 MXN",
      "3. MIXTA — mitad carne, mitad pollo",
      "⚠️ NO hay empanadas de chorizo, res, queso, vegetariana ni ningún otro tipo.",
    ],
  },
  cantidad: {
    desc: "selección de cantidad de empanadas",
    opciones: [
      "1. 1 empanada — $25 MXN",
      "2. 3 empanadas — $70 MXN",
      "3. 6 empanadas — $135 MXN",
      "4. 12 empanadas — $260 MXN",
      "5. Otra cantidad — el cliente escribe el número",
    ],
  },
  cantidad_custom: {
    desc: "el cliente debe escribir un número específico de empanadas",
    opciones: ["Escribe el número exacto de empanadas que quiere"],
  },
  evento_cantidad: {
    desc: "pedido para evento: el cliente escribe cuántas empanadas necesita",
    opciones: ["Escribe el número aproximado de empanadas para el evento (mínimo 20)"],
  },
  entrega: {
    desc: "selección del método de entrega",
    opciones: [
      "1. A domicilio — el repartidor lleva el pedido a la dirección del cliente",
      "2. Recoger en tienda — el cliente pasa a recoger su pedido",
    ],
  },
  direccion: {
    desc: "el cliente debe dar su dirección de entrega",
    opciones: [
      "Escribir la dirección completa (calle, número exterior, colonia)",
      "O compartir su ubicación GPS desde WhatsApp",
    ],
  },
  pago: {
    desc: "selección del método de pago",
    opciones: [
      "1. Efectivo — paga en efectivo cuando recibe el pedido",
      "2. Tarjeta débito o crédito — se le envía un link de pago seguro",
    ],
  },
  factura: {
    desc: "el cliente indica si necesita factura fiscal (CFDI)",
    opciones: [
      "1. Sí, necesito factura — se le pedirán datos fiscales (RFC, razón social)",
      "2. No, gracias — continuar sin factura",
    ],
  },
  datos_fiscales_rfc: {
    desc: "el cliente debe escribir su RFC para la factura",
    opciones: ["RFC de 12 caracteres (persona moral) o 13 (persona física)"],
  },
  datos_fiscales_razon: {
    desc: "el cliente debe escribir su razón social o nombre completo tal como aparece en el SAT",
    opciones: ["Razón social o nombre completo del contribuyente"],
  },
  confirmar: {
    desc: "confirmación final del pedido — el cliente revisa el resumen y confirma o cancela",
    opciones: [
      "Escribir 'sí', 'confirmar', 'dale', 'listo' para confirmar el pedido",
      "Escribir 'cancelar' o 'no' para cancelar",
    ],
  },
  calificar_tiempo: {
    desc: "calificación de la velocidad de entrega del pedido",
    opciones: ["1=Pésimo, 2=Malo, 3=Regular, 4=Muy bien, 5=Excelente"],
  },
  calificar_producto: {
    desc: "calificación de la calidad de las empanadas",
    opciones: ["1=Pésimo, 2=Malo, 3=Regular, 4=Muy bien, 5=Excelente"],
  },
}

// Pasos donde el audio agrega valor real (Paisa guía activamente)
const AUDIO_PRIORITY_STEPS = new Set([
  "inicio",
  "tipo_empanada",
  "entrega",
  "pago",
  "confirmar",
])

// ─────────────────────────────────────────────
//  1. TRANSCRIBIR AUDIO
// ─────────────────────────────────────────────
async function transcribeAudio(audioBuffer, mimeType) {
  console.log("🎙️ Transcribiendo audio...")
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: audioBuffer.toString("base64") } },
        { text: "Transcribe exactamente lo que dice este audio en español. Devuelve SOLO el texto, sin comillas ni explicaciones." },
      ],
    }],
  }
  const res = await httpsPost(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TEXT}:generateContent?key=${GEMINI_API_KEY}`,
    body
  )
  if (res.error) throw new Error(`Transcripción: ${res.error.message}`)
  const text = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error("No se pudo transcribir")
  console.log("📝 Transcripción:", text)
  return text
}

// ─────────────────────────────────────────────
//  2. ANALIZAR Y RESPONDER (con decisión de audio)
// ─────────────────────────────────────────────
/**
 * Genera la respuesta colombiana Y decide si debe ir con audio o solo texto.
 *
 * Devuelve: { responseText: string, useAudio: boolean }
 *
 * La IA devuelve JSON:
 *   { "respuesta": "...", "usar_audio": true/false, "razon": "..." }
 */
async function analyzeAndRespond(userInput, step, sessionData = {}) {
  console.log(`🤖 Analizando [${step}]: "${userInput.slice(0, 60)}"`)

  const menuInfo = MENU_CONTEXT[step] || { desc: "continuar con el pedido", opciones: [] }

  // Construir resumen del pedido en progreso
  const tipoMap = { emp_carne: "carne 🥩", emp_pollo: "pollo 🍗", emp_ambas: "mixta (carne y pollo)" }
  const pedidoLines = []
  if (sessionData.nombre)   pedidoLines.push(`Cliente: ${sessionData.nombre}`)
  if (sessionData.tipo)     pedidoLines.push(`Empanada: ${tipoMap[sessionData.tipo] || sessionData.tipo}`)
  if (sessionData.cantidad) pedidoLines.push(`Cantidad: ${sessionData.cantidad}`)
  if (sessionData.entrega)  pedidoLines.push(`Entrega: ${sessionData.entrega === "entrega_domicilio" ? "a domicilio" : "en tienda"}`)
  if (sessionData.pago)     pedidoLines.push(`Pago: ${sessionData.pago === "pago_efectivo" ? "efectivo" : "tarjeta"}`)
  const pedidoResumen = pedidoLines.length ? pedidoLines.join(" | ") : "Pedido aún sin datos"

  // Regla de audio para la IA: contexto de cuándo vale la pena
  const audioRegla = AUDIO_PRIORITY_STEPS.has(step)
    ? "Este paso es importante para guiar al cliente. El audio agrega calidez aquí. Considera usar audio."
    : "Este paso es transaccional/técnico. El audio no agrega mucho valor aquí. Prefiere NO usar audio SALVO que el mensaje lo amerite especialmente."

  const prompt = `${PERSONA}

═══════════════════════════════
ESTADO ACTUAL DEL PEDIDO:
${pedidoResumen}

PASO ACTUAL: ${menuInfo.desc}

OPCIONES DISPONIBLES EN ESTE PASO:
${menuInfo.opciones.map(o => `  • ${o}`).join("\n")}
═══════════════════════════════

MENSAJE DEL CLIENTE: "${userInput}"

Tu tarea:
1. Analiza si el cliente está pidiendo algo que NO existe en las opciones (ej: "empanada de chorizo").
   Si es así, corrígelo amablemente y redirige a las opciones reales.
2. Si el cliente está en el paso correcto, guíalo hacia la siguiente acción.
3. Genera una respuesta MUY CORTA (máximo 2 oraciones), en estilo colombiano bogotano.
4. Decide si enviar audio:
   ${audioRegla}

Responde ÚNICAMENTE con este JSON (sin markdown, sin explicaciones):
{
  "respuesta": "texto de la respuesta en estilo colombiano",
  "usar_audio": true o false,
  "razon": "por qué usas o no audio (1 frase corta)"
}`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
  }

  const res = await httpsPost(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TEXT}:generateContent?key=${GEMINI_API_KEY}`,
    body
  )
  if (res.error) throw new Error(`Respuesta IA: ${res.error.message}`)

  let raw = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""

  // Limpiar posibles markdown fences
  raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Si falla el JSON, usar la respuesta como texto puro sin audio
    console.warn("⚠️ JSON inválido de Gemini, usando texto plano:", raw.slice(0, 100))
    parsed = { respuesta: raw || "¡A la orden parcero! ¿Qué vas a querer?", usar_audio: false, razon: "fallback" }
  }

  const responseText = parsed.respuesta || "¡A la orden!"
  const useAudio     = !!parsed.usar_audio
  console.log(`💬 Respuesta: "${responseText.slice(0, 80)}" | Audio: ${useAudio} (${parsed.razon})`)

  return { responseText, useAudio }
}

// ─────────────────────────────────────────────
//  3. TEXTO → WAV  (Gemini TTS, voz Aoede)
// ─────────────────────────────────────────────
async function textToSpeech(text) {
  console.log(`🔊 TTS → "${text.slice(0, 70)}..."`)

  // Instrucción que fuerza voz colombiana con groserías, ritmo pausado y audio largo
  const ttsContent =
    `Eres una vendedora colombiana de Bogotá, divertida y pícara. ` +
    `Habla de forma PAUSADA y EXPRESIVA, con acento bogotano auténtico. ` +
    `Usa modismos colombianos: parcero, chimba, juepucha, hijueputa (en tono cariñoso), berraco, bacano. ` +
    `NO hables rápido. Haz pausas naturales entre frases. El audio debe durar mínimo 5 segundos. ` +
    `Lee el siguiente texto con toda esa personalidad:\n\n${text}`

  const body = {
    contents: [{ role: "user", parts: [{ text: ttsContent }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
    },
  }

  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`   → TTS intento ${attempt}/3`)
      const res = await httpsPost(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${GEMINI_API_KEY}`,
        body
      )
      if (res.error) {
        lastError = res.error.message
        console.warn(`   ⚠️ Error API TTS: ${lastError}`)
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
        continue
      }
      const parts = res.candidates?.[0]?.content?.parts || []
      let audioData = null
      for (const p of parts) {
        audioData = p.inlineData?.data || p.inline_data?.data || null
        if (audioData) break
      }
      if (!audioData) {
        lastError = "Sin audio en respuesta"
        console.warn(`   ⚠️ ${lastError}`)
        continue
      }
      const pcm = Buffer.from(audioData, "base64")
      const wav = pcmToWav(pcm)
      console.log(`✅ WAV generado: ${wav.length} bytes (~${(wav.length/48000).toFixed(1)}s)`)
      return wav
    } catch (err) {
      lastError = err.message
      console.warn(`   ⚠️ Excepción intento ${attempt}: ${lastError}`)
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw new Error(`TTS fallido: ${lastError}`)
}

// ─────────────────────────────────────────────
//  4. PCM → WAV header
// ─────────────────────────────────────────────
function pcmToWav(pcm, channels = 1, sampleRate = 24000, bitsPerSample = 16) {
  const byteRate   = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize   = pcm.length
  const wav        = Buffer.alloc(44 + dataSize)
  wav.write("RIFF",              0, "ascii")
  wav.writeUInt32LE(36+dataSize, 4)
  wav.write("WAVE",              8, "ascii")
  wav.write("fmt ",             12, "ascii")
  wav.writeUInt32LE(16,         16)
  wav.writeUInt16LE(1,          20)
  wav.writeUInt16LE(channels,   22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(byteRate,   28)
  wav.writeUInt16LE(blockAlign, 32)
  wav.writeUInt16LE(bitsPerSample, 34)
  wav.write("data",             36, "ascii")
  wav.writeUInt32LE(dataSize,   40)
  pcm.copy(wav, 44)
  return wav
}

// ─────────────────────────────────────────────
//  5. WAV → OGG Opus  (ffmpeg)
// ─────────────────────────────────────────────
function wavToOgg(wavBuffer) {
  return new Promise((resolve, reject) => {
    const tmpWav = path.join(os.tmpdir(), `emp_in_${Date.now()}.wav`)
    const tmpOgg = path.join(os.tmpdir(), `emp_out_${Date.now()}.ogg`)
    fs.writeFileSync(tmpWav, wavBuffer)
    execFile("ffmpeg", ["-y", "-i", tmpWav, "-c:a", "libopus", "-b:a", "64k", "-ar", "48000", tmpOgg],
      (err, _stdout, stderr) => {
        try { fs.unlinkSync(tmpWav) } catch {}
        if (err) {
          try { fs.unlinkSync(tmpOgg) } catch {}
          return reject(new Error(`ffmpeg: ${stderr || err.message}`))
        }
        const ogg = fs.readFileSync(tmpOgg)
        try { fs.unlinkSync(tmpOgg) } catch {}
        resolve(ogg)
      }
    )
  })
}

// ─────────────────────────────────────────────
//  PIPELINE COMPLETO (retrocompatibilidad)
// ─────────────────────────────────────────────
async function processWithAI({ textInput, audioBuffer, audioMime, step, sessionData = {} }) {
  let userInput = textInput || "hola"
  if (audioBuffer && audioMime) {
    userInput = await transcribeAudio(audioBuffer, audioMime)
  }
  return { userInput }
}

module.exports = { transcribeAudio, textToSpeech, wavToOgg, processWithAI }