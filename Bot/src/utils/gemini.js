/**
 * src/utils/gemini.js
 * TTS y transcripción con Gemini. NO_AI_MODE viene de config.
 */
const https    = require("https")
const fs       = require("fs")
const path     = require("path")
const os       = require("os")
const { execFile } = require("child_process")
const config   = require("../../config")

const NO_AI_MODE     = config.gemini.noAiMode
const GEMINI_API_KEY = config.gemini.apiKey
const MODEL_TEXT     = "gemini-2.0-flash"
const MODEL_TTS      = "gemini-2.5-flash-preview-tts"

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

async function transcribeAudio(audioBuffer, mimeType) {
  if (NO_AI_MODE) {
    console.log("🚫 [NO_AI_MODE] transcribeAudio() omitida")
    throw new Error("NO_AI_MODE: transcripción de audio desactivada")
  }
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: audioBuffer.toString("base64") } },
        { text: "Transcribe exactamente lo que dice este audio en español. Devuelve SOLO el texto, sin comillas ni explicaciones." },
      ],
    }],
  }
  const res = await httpsPost(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TEXT}:generateContent?key=${GEMINI_API_KEY}`, body
  )
  if (res.error) throw new Error(`Transcripción: ${res.error.message}`)
  const text = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error("No se pudo transcribir")
  return text
}

async function textToSpeech(text) {
  if (NO_AI_MODE) {
    console.log("🚫 [NO_AI_MODE] textToSpeech() omitida")
    return null
  }
  const ttsContent =
    `Eres una vendedora colombiana de Bogotá, divertida y pícara. ` +
    `Habla de forma PAUSADA y EXPRESIVA, con acento bogotano auténtico. ` +
    `Usa modismos colombianos: parcero, chimba, juepucha, berraco, bacano. ` +
    `NO hables rápido. El audio debe durar mínimo 5 segundos. ` +
    `Lee el siguiente texto con toda esa personalidad:\n\n${text}`

  const body = {
    contents: [{ role: "user", parts: [{ text: ttsContent }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
    },
  }

  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await httpsPost(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${GEMINI_API_KEY}`, body
      )
      if (res.error) { lastError = res.error.message; continue }
      const parts = res.candidates?.[0]?.content?.parts || []
      let audioData = null
      for (const p of parts) { audioData = p.inlineData?.data || p.inline_data?.data || null; if (audioData) break }
      if (!audioData) { lastError = "Sin audio en respuesta"; continue }
      return pcmToWav(Buffer.from(audioData, "base64"))
    } catch (err) {
      lastError = err.message
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw new Error(`TTS fallido: ${lastError}`)
}

function pcmToWav(pcm, channels = 1, sampleRate = 24000, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const wav = Buffer.alloc(44 + pcm.length)
  wav.write("RIFF", 0, "ascii"); wav.writeUInt32LE(36 + pcm.length, 4)
  wav.write("WAVE", 8, "ascii"); wav.write("fmt ", 12, "ascii")
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(channels, 22)
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(byteRate, 28)
  wav.writeUInt16LE(blockAlign, 32); wav.writeUInt16LE(bitsPerSample, 34)
  wav.write("data", 36, "ascii"); wav.writeUInt32LE(pcm.length, 40)
  pcm.copy(wav, 44)
  return wav
}

function wavToOgg(wavBuffer) {
  return new Promise((resolve, reject) => {
    const tmpWav = path.join(os.tmpdir(), `emp_in_${Date.now()}.wav`)
    const tmpOgg = path.join(os.tmpdir(), `emp_out_${Date.now()}.ogg`)
    fs.writeFileSync(tmpWav, wavBuffer)
    execFile("ffmpeg", ["-y", "-i", tmpWav, "-c:a", "libopus", "-b:a", "64k", "-ar", "48000", tmpOgg],
      (err, _stdout, stderr) => {
        try { fs.unlinkSync(tmpWav) } catch {}
        if (err) { try { fs.unlinkSync(tmpOgg) } catch {}; return reject(new Error(`ffmpeg: ${stderr || err.message}`)) }
        const ogg = fs.readFileSync(tmpOgg)
        try { fs.unlinkSync(tmpOgg) } catch {}
        resolve(ogg)
      }
    )
  })
}

module.exports = { transcribeAudio, textToSpeech, wavToOgg, NO_AI_MODE }