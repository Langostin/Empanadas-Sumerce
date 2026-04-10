/**
 * db.js
 * ─────────────────────────────────────────────
 * Conexión a SQL Server (EmpanadasSumerce)
 * Instala: npm install mssql
 * ─────────────────────────────────────────────
 */

const sql = require("mssql")

const config = {
  user:     process.env.DB_USER     || "sa",
  password: process.env.DB_PASSWORD || "sqlserver6488",
  server:   process.env.DB_SERVER   || "localhost",
  database: process.env.DB_NAME     || "EmpanadasSumerce",
  port:     parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt:                false,
    trustServerCertificate: true,
    enableArithAbort:       true,
  },
  pool: {
    max:              10,
    min:              0,
    idleTimeoutMillis: 30000,
  },
}

let pool = null

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config)
    console.log("✅ Conectado a SQL Server - EmpanadasSumerce")
  }
  return pool
}

// Helper genérico para ejecutar queries
async function query(queryStr, params = {}) {
  const p = await getPool()
  const req = p.request()
  for (const [key, val] of Object.entries(params)) {
    req.input(key, val)
  }
  return req.query(queryStr)
}

// Helper para stored procedures
async function exec(spName, params = {}) {
  const p = await getPool()
  const req = p.request()
  for (const [key, val] of Object.entries(params)) {
    req.input(key, val)
  }
  return req.execute(spName)
}

module.exports = { sql, getPool, query, exec }