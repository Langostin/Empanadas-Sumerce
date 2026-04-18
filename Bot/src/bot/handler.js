/**
 * src/bot/handler.js
 * Máquina de estados principal del bot.
 */
const { downloadMediaMessage } = require("@whiskeysockets/baileys")
const { transcribeAudio, NO_AI_MODE } = require("../utils/gemini")
const { sendText, sendAudio, GUIAS }  = require("./frases")
const { MENUS, resolveNumeric }       = require("./menus")
const { getSession, saveSession, resetSession } = require("./sessions")
const db     = require("../services/clienteRepo")
const stripe = require("../services/stripe")

// ── Mapa de regímenes para mostrar en resumen ──────────────────
const REGIMEN_NOMBRE = {
  "605": "Sueldos y Salarios",
  "606": "Arrendamiento",
  "612": "Actividades Empresariales",
  "616": "Sin obligaciones fiscales",
  "621": "Incorporación Fiscal",
  "625": "Plataformas Tecnológicas",
  "626": "Simplificado de Confianza",
  "601": "General Ley Personas Morales",
}

// ──────────────────────────────────────────────────────────────────
//  buildResumen
// ──────────────────────────────────────────────────────────────────
function buildResumen(data) {
  const tipoMap    = { emp_carne: "Carne 🥩", emp_pollo: "Pollo 🍗", emp_ambas: "Mixta 🍽️" }
  const entregaMap = { entrega_domicilio: "A domicilio 🏠", entrega_tienda: "En tienda 🏪" }
  const pagoMap    = { pago_efectivo: "Efectivo 💵", pago_tarjeta: "Tarjeta 💳" }
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
  if (data.rfc) {
    r += `• RFC: ${data.rfc}\n`
    r += `• Razón social: ${data.razonSocial || "—"}\n`
    if (data.codigoPostalFiscal) r += `• CP fiscal: ${data.codigoPostalFiscal}\n`
    if (data.regimenClave) r += `• Régimen: ${REGIMEN_NOMBRE[data.regimenClave] || data.regimenClave} (${data.regimenClave})\n`
  }
  return r
}

// ──────────────────────────────────────────────────────────────────
//  handleMessage — máquina de estados
// ──────────────────────────────────────────────────────────────────
async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid

  const isAudio = !!(msg.message?.audioMessage || msg.message?.pttMessage)
  const rawText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.message?.buttonsResponseMessage?.selectedButtonId || ""

  const text = rawText.trim().toLowerCase()
  const session = await getSession(jid)
  console.log(`[${jid}] step=${session.step} | texto="${text}" | audio=${isAudio}`)

  try { await db.upsertCliente({ whatsapp: jid }) } catch {}

  // ── Audio entrante ───────────────────────────────────────────
  if (isAudio) {
    if (NO_AI_MODE) {
      return sendText(sock, jid,
        `¡Ay parcero, por ahora solo recibimos mensajes de texto! 📝\n` +
        `Escríbame el número de su opción del menú. ¡A la orden!`)
    }
    try {
      await sendText(sock, jid, "🎙️ _Escuchando..._")
      const buf  = await downloadMediaMessage(msg, "buffer", {})
      const mime = msg.message?.audioMessage?.mimetype || msg.message?.pttMessage?.mimetype || "audio/ogg; codecs=opus"
      const transcripcion = await transcribeAudio(buf, mime)
      console.log(`📝 Transcripción: "${transcripcion}"`)
      return handleMessage(sock, { ...msg, message: { conversation: transcripcion } })
    } catch (err) {
      console.error("❌ Error audio:", err.message)
      return sendText(sock, jid, `¡Ay juepucha, no le entendí el audio! 😅\nEscríbame el texto o el número de su opción.`)
    }
  }

  const resolvedText = resolveNumeric(session.step, text)

  // ── Palabras clave globales ──────────────────────────────────
  const esHola = ["menu","menú","inicio","hola","buenas","hey","ey","start","empezar"].some(k => text.includes(k))
  if (esHola) {
    await resetSession(jid)
    await db.log("INFO", "bot_whatsapp", "menu_principal", { whatsapp: jid })
    return sendAudio(sock, jid, "bienvenida", GUIAS.bienvenida(), () => MENUS.principal(sock, jid))
  }

  if (["cancelar","cancel","salir"].includes(text)) {
    await resetSession(jid)
    return sendText(sock, jid, `❌ Pedido cancelado parcero. Escribe *menú* cuando quieras volver, ¡a la orden!`)
  }

  // ── Máquina de estados ───────────────────────────────────────
  switch (session.step) {

    // ────────────────────────────── INICIO ──────────────────────
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
        session.data = { tipoOrden: "individual", nombre: cliente.nombre }
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
        let m = "📦 *Tus últimos pedidos:*\n\n"
        for (const p of pedidos) {
          m += `*${p.folio}* — ${p.estado_pedido} — $${p.total} MXN\n`
          m += `  ${p.productos || "—"}\n`
          m += `  ${new Date(p.fecha_pedido).toLocaleDateString("es-MX")}\n\n`
        }
        return sendText(sock, jid, m + "Escribe *menú* para volver.")

      } else if (resolvedText === "mis_datos") {
        const cliente = await db.getCliente(jid).catch(() => null)
        const dirs    = await db.getDirecciones(jid).catch(() => [])
        let m = `👤 *Tus datos registrados:*\n\n• WhatsApp: ${jid}\n`
        if (cliente?.nombre)  m += `• Nombre: ${cliente.nombre} ${cliente.apellidos || ""}\n`
        if (cliente?.email)   m += `• Email: ${cliente.email}\n`
        m += `• Pedidos realizados: ${cliente?.total_pedidos || 0}\n`
        m += `• Total gastado: $${cliente?.total_gastado || 0} MXN\n`
        if (dirs.length) {
          m += `\n📍 *Direcciones guardadas:*\n`
          for (const d of dirs) m += `  - ${d.alias || "Sin alias"}: ${d.calle} ${d.numero_exterior || ""}, ${d.colonia || ""}\n`
        }
        return sendText(sock, jid, m + "\nEscribe *menú* para volver.")

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
      }
      return sendAudio(sock, jid, "no_entendi", GUIAS.no_entendi("inicio"), () => MENUS.principal(sock, jid))
    }

    // ──────────────────────────── REGISTRO ──────────────────────
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
        await db.log("INFO", "bot_whatsapp", "cliente_registrado", { whatsapp: jid, detalle: { nombre, apellidos } })
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

    // ──────────────────────────── PEDIDO ────────────────────────
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
          await db.query(`INSERT INTO CotizacionEvento (whatsapp, cantidad_estimada, estado) VALUES (@wa, @cant, 'pendiente')`, { wa: jid, cant: n })
          await db.query(`INSERT INTO Alerta (tipo, mensaje) VALUES ('cotizacion_evento', @msg)`,
            { msg: `Cotización evento: ${session.data.nombre || jid} — ${n} empanadas` })
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
        return sendAudio(sock, jid, "pedir_pago", `🏪 ¡Perfecto, pasa por las empanadas a la tienda!\n\n` + GUIAS.pedir_pago(), () => MENUS.pago(sock, jid))
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
        const dirId = await db.agregarDireccion(jid, { alias: "Entrega", calle: dirTxt, latitud: lat, longitud: lng })
        session.data.direccionId = dirId
      } catch {}
      session.data.direccion = dirTxt
      session.step = "pago"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "pedir_pago", GUIAS.direccion_ok(dirTxt) + "\n" + GUIAS.pedir_pago(), () => MENUS.pago(sock, jid))
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

    // ──────────────────────────── FACTURA ───────────────────────
    case "factura": {
      if (resolvedText === "factura_si") {
        session.data.factura = resolvedText
        const df = await db.getDatoFiscal(jid).catch(() => null)
        if (df) {
          const faltaCP      = !df.codigo_postal?.trim()
          const faltaRegimen = !df.regimen_clave?.trim()

          if (faltaCP || faltaRegimen) {
            session.data.datoFiscalId = df.dato_fiscal_id
            session.data.rfc          = df.rfc
            session.data.razonSocial  = df.razon_social
            if (faltaCP) {
              session.step = "datos_fiscales_cp"
              await saveSession(jid, session)
              return sendText(sock, jid, `🧾 Ya tengo su RFC *${df.rfc}* guardado.\n📮 Pero necesito su *código postal fiscal* (5 dígitos):`)
            }
            session.data.codigoPostalFiscal = df.codigo_postal
            session.step = "datos_fiscales_regimen"
            await saveSession(jid, session)
            return sendAudio(sock, jid, "pedir_pago", `🏛️ Solo falta su *régimen fiscal*. Selecciónelo del menú 👇`, () => MENUS.regimen(sock, jid))
          }

          // Datos completos
          session.data = { ...session.data, datoFiscalId: df.dato_fiscal_id, rfc: df.rfc, razonSocial: df.razon_social, codigoPostalFiscal: df.codigo_postal, regimenClave: df.regimen_clave }
          session.step = "confirmar_datos"
          await saveSession(jid, session)
          return sendAudio(sock, jid, "confirmar_datos",
            `🧾 *Datos fiscales:*\n• RFC: ${df.rfc}\n• Razón social: ${df.razon_social}\n• CP: ${df.codigo_postal}\n• Régimen: ${df.regimen_clave}\n\n` +
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
      const rfcInput = rawText.trim().toUpperCase().replace(/\s/g, "")
      const rfcValido = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfcInput)
        || rfcInput === "XAXX010101000" || rfcInput === "XEXX010101000"
      if (!rfcValido) {
        return sendText(sock, jid,
          `¡Uy parcero, ese RFC no parece válido! 😅\nDebe tener 12 o 13 caracteres alfanuméricos.\nEscríbalo de nuevo por favor:`)
      }
      session.data.rfc = rfcInput
      session.step = "datos_fiscales_razon"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "pedir_razon_social", `✅ *RFC:* ${rfcInput}\n\nAhora escríbame su *razón social* exactamente como aparece en el SAT:`)
    }

    case "datos_fiscales_razon": {
      const razon = rawText.trim()
      if (razon.length < 3) return sendText(sock, jid, `¡Ay parcero, eso es muy corto! Escríbame su razón social completa tal como aparece en el SAT:`)
      session.data.razonSocial = razon
      session.step = "datos_fiscales_cp"
      await saveSession(jid, session)
      return sendText(sock, jid,
        `✅ *Razón social:* ${razon}\n\n` + GUIAS.pedir_cp_fiscal())
    }

    case "datos_fiscales_cp": {
      const cp = rawText.trim().replace(/\D/g, "")
      if (cp.length !== 5) {
        return sendText(sock, jid, `¡Uy juepucha, el código postal debe tener exactamente *5 dígitos*! 😅\nEscríbalo de nuevo, ej: *32000*`)
      }
      session.data.codigoPostalFiscal = cp
      session.step = "datos_fiscales_regimen"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "pedir_pago",
        `✅ *CP fiscal:* ${cp}\n\n` + GUIAS.pedir_regimen(),
        () => MENUS.regimen(sock, jid))
    }

    case "datos_fiscales_regimen": {
      const regimenClave = resolvedText   // ya viene resuelto del NUMERIC_MAPS
      if (!REGIMEN_NOMBRE[regimenClave]) {
        return sendText(sock, jid, `¡Ay parcero, escríbame el *número* de su régimen del menú de arriba! 😅`)
      }
      session.data.regimenClave = regimenClave

      try {
        const dfId = await db.guardarDatoFiscal(jid, {
          rfc:          session.data.rfc,
          razonSocial:  session.data.razonSocial,
          codigoPostal: session.data.codigoPostalFiscal,
          regimenClave,
        })
        session.data.datoFiscalId = dfId
      } catch (err) { console.error("Error guardando dato fiscal:", err.message) }

      session.step = "confirmar_datos"
      await saveSession(jid, session)
      return sendAudio(sock, jid, "confirmar_datos",
        `✅ *Régimen:* ${REGIMEN_NOMBRE[regimenClave]} (${regimenClave})\n\n` +
        GUIAS.confirmar(buildResumen(session.data)))
    }

    // ──────────────────────────── CONFIRMACIÓN ──────────────────
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

    case "confirmar": {
      const palabrasSi = ["sí","si","yes","confirmar","confirmo","dale","listo","va","ok"]
      if (palabrasSi.some(k => text.includes(k))) {
        const productoMap = { emp_carne: 1, emp_pollo: 2 }
        const items = []
        if (session.data.tipo === "emp_ambas") {
          const mitad = Math.ceil((session.data.cantidad || 1) / 2)
          const resto = Math.floor((session.data.cantidad || 1) / 2)
          if (mitad > 0) items.push({ productoId: 1, cantidad: mitad })
          if (resto > 0) items.push({ productoId: 2, cantidad: resto })
        } else {
          items.push({ productoId: productoMap[session.data.tipo] || 1, cantidad: session.data.cantidad || 1 })
        }

        const metodoPagoId = session.data.pago === "pago_efectivo" ? 1 : 2

        try {
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

          let confirmMsg =
            `✅ *¡Pedido confirmado, parcero!* 🎉🇨🇴\n\n` +
            `*Folio:* ${resultado.folio}\n` +
            `*Código de entrega:* \`${resultado.codigoEntrega}\`\n` +
            `_(Guárdelo, lo necesitará al recibir su pedido)_\n\n` +
            buildResumen(session.data) +
            `\n💰 *Total: $${resultado.total} MXN*`

          if (resultado.descuento > 0)
            confirmMsg += `\n🎁 *Descuento primera compra: -$${resultado.descuento} MXN*\n¡Qué chimba, bienvenido!`

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
              confirmMsg += `\n\n💳 *Paga tu pedido aquí:*\n${pago.checkoutUrl}\n_(Válido 30 minutos)_`
            } catch (stripeErr) {
              console.error("❌ Stripe:", stripeErr.message)
              confirmMsg += `\n\n💳 _Hubo un problema generando el link. Le contactamos pronto._`
            }
          }

          confirmMsg += `\n\n¡Muchas gracias ${session.data.nombre || "parcero"}! Sus empanadas ya están en preparación 🥟🔥\nEscribe *menú* para hacer otro pedido.`

          await db.log("INFO", "bot_whatsapp", "pedido_confirmado", {
            whatsapp: jid, pedidoId: resultado.pedidoId,
            detalle: { folio: resultado.folio, total: resultado.total },
          })
          await sendAudio(sock, jid, "pedido_confirmado", confirmMsg)
          await resetSession(jid)

        } catch (err) {
          console.error("❌ Error creando pedido:", err.message)
          await db.log("ERROR", "bot_whatsapp", "error_crear_pedido", { whatsapp: jid, detalle: err.message })
          return sendText(sock, jid, `😔 ¡Ay juepucha, hubo un error al procesar el pedido!\nPor favor intente de nuevo o escribe *cancelar*.\n_Error: ${err.message}_`)
        }
        break
      }
      if (text.includes("cancel") || text.includes("no")) {
        await resetSession(jid)
        return sendText(sock, jid, `❌ Pedido cancelado. Escribe *menú* cuando quieras, ¡a la orden!`)
      }
      session.step = "confirmar_datos"
      await saveSession(jid, session)
      return sendText(sock, jid, `Escribe *SÍ* para confirmar o *CANCELAR* para salir:\n\n` + buildResumen(session.data))
    }

    // ──────────────────────────── CALIFICACIONES ─────────────────
    case "calificar_tiempo": {
      const calMap = { cal_5:5, cal_4:4, cal_3:3, cal_2:2, cal_1:1 }
      const cal = calMap[resolvedText] || parseInt(text)
      if (cal >= 1 && cal <= 5) {
        try { await db.guardarCalificacionEntrega(session.data.pedidoId, cal) } catch {}
        session.step = "inicio"
        await saveSession(jid, session)
        return sendText(sock, jid, `⭐ ¡Gracias por su calificación de entrega (${cal}/5), parcero!\nEscribe *menú* para volver.`)
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
          ? `⭐ ¡Qué chimba que le gustaron! (${cal}/5) 🇨🇴🥟\nEscribe *menú* cuando quiera pedir de nuevo.`
          : `⭐ Gracias por su honestidad (${cal}/5). ¡Trabajaremos para mejorar! 💪\nEscribe *menú* para volver.`)
      }
      return MENUS.calificacion(sock, jid, "producto")
    }

    // ──────────────────────────── PAGO FALLIDO ───────────────────
    case "pago_fallido_opciones": {
      const pedidoData = session.data
      if (text === "1" || text.includes("efectivo")) {
        try {
          await db.query(
            `UPDATE Pedido SET metodo_pago_id=1, estado_pago='pendiente', estado_pedido='recibido' WHERE pedido_id=@pid`,
            { pid: pedidoData.pedidoId }
          )
          await db.log("INFO", "bot_whatsapp", "cambio_pago_efectivo", { whatsapp: jid, pedidoId: pedidoData.pedidoId })
        } catch (err) { console.error("❌ Error cambiando método de pago:", err.message) }
        await resetSession(jid)
        return sendText(sock, jid,
          `✅ *¡Listo parcero!* Cambiamos tu pedido *${pedidoData.folio}* a pago en efectivo. 💵\n\n` +
          `💰 Total a pagar al recibir: *$${Number(pedidoData.total).toFixed(2)} MXN*\n\nEscribe *menú* para hacer otro pedido.`)

      } else if (text === "2" || text.includes("cancel")) {
        try {
          await db.query(`UPDATE Pedido SET estado_pedido='cancelado', estado_pago='fallido' WHERE pedido_id=@pid`, { pid: pedidoData.pedidoId })
          await db.query(`UPDATE Cliente SET total_pedidos=total_pedidos-1 WHERE whatsapp=@wa AND total_pedidos>0`, { wa: jid })
        } catch (err) { console.error("❌ Error cancelando pedido:", err.message) }
        await resetSession(jid)
        return sendText(sock, jid,
          `❌ *Pedido ${pedidoData.folio} cancelado.*\n\nNo hay ningún cobro, parcero. ¡La próxima vez será! 🇨🇴\n\nEscribe *menú* cuando quieras pedir de nuevo.`)

      }
      return sendText(sock, jid,
        `¡Uy parcero, no le entendí! 😅\n\n*1.* 💵 Pagar en efectivo\n*2.* ❌ Cancelar el pedido\n\n_Pedido: ${pedidoData.folio} — $${Number(pedidoData.total).toFixed(2)} MXN_`)
    }

    default: {
      await resetSession(jid)
      return sendAudio(sock, jid, "bienvenida", GUIAS.bienvenida(), () => MENUS.principal(sock, jid))
    }
  }
}

module.exports = { handleMessage, buildResumen }