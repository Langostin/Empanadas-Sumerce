require("dotenv").config()
const express = require("express")
const axios = require("axios")

const app = express()
app.use(express.json())

// ── Configuración ─────────────────────────────
const SANDBOX = process.env.FACTURAMA_SANDBOX !== "false"

const BASE_URL = SANDBOX
  ? "https://apisandbox.facturama.mx"
  : "https://api.facturama.mx"

const FACTURAMA_USER = process.env.FACTURAMA_USER
const FACTURAMA_PASS = process.env.FACTURAMA_PASS

const AUTH = "Basic " + Buffer.from(`${FACTURAMA_USER}:${FACTURAMA_PASS}`).toString("base64")

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: AUTH,
    "Content-Type": "application/json",
  },
})
const now = new Date()

const fechaLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 19)


// ── Endpoint de prueba ─────────────────────────
app.get("/test-factura", async (req, res) => {
  try {
    const cfdiPayload = {
      Currency: "MXN",
      ExpeditionPlace: process.env.EMISOR_LUGAR_EXPEDICION || "64000",
      PaymentForm: "01",
      PaymentMethod: "PUE",
      CfdiType: "I",
      NameId: "1",
      Date: fechaLocal,

      Issuer: {
        Rfc: process.env.EMISOR_RFC || "EMP020101AA1",
        Name: process.env.EMISOR_NOMBRE || "EMPANADAS SUMERCE",
        FiscalRegime: process.env.EMISOR_REGIMEN || "621",
      },

      Receiver: {
        Rfc: "SABE0502241F0", // público en general (pruebas)
        Name: "ERICK DANIEL DE SANTIAGO BUENO",
        CfdiUse: "S01",
        FiscalRegime: "616",
        TaxZipCode: "32599",
      },
        GlobalInformation: {
    Periodicity: "01",
    Months: "04",
    Year: "2026",
  },

     Items: [
        {
            ProductCode: "90101501",
            Description: "Empanada de prueba",
            Unit: "Pieza",
            UnitCode: "H87",
            Quantity: 1,
            UnitPrice: 50,
            Subtotal: 50,

            TaxObject: "02",

            Taxes: [
            {
                Total: 8,
                Name: "IVA",
                Base: 50,
                Rate: 0.16,
                IsRetention: false,
            },
            ],

            Total: 58, // 🔥 50 + 8
        },
        ],
    }

    // ── Crear factura ─────────────────────
const resp = await http.post("/api/3/cfdis", cfdiPayload)

console.log("📄 RESPUESTA COMPLETA CFDI:")
console.log(JSON.stringify(resp.data, null, 2))

const cfdi = resp.data
const cfdiId = cfdi.Id
const uuid = cfdi.Complement?.TaxStamp?.Uuid

const pdfResp = await http.get(`/cfdi/pdf/issued/${cfdiId}`)

const pdfBuffer = Buffer.from(pdfResp.data.Content, "base64")

res.setHeader("Content-Type", "application/pdf")
res.setHeader("Content-Disposition", `attachment; filename="factura-${uuid}.pdf"`)

return res.send(pdfBuffer)


  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.response?.data || err.message,
    })
  }
})

// ── Servidor ────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log("USER:", FACTURAMA_USER)
console.log("PASS:", FACTURAMA_PASS)
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})