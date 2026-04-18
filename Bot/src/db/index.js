/**
 * src/db/index.js
 * Conexión a SQL Server. Exporta: sql, getPool, query, exec
 */
const sql    = require("mssql")
const config = require("../../config")

const dbConfig = {
  ...config.db,
  options: {
    encrypt:               false,
    trustServerCertificate: true,
    enableArithAbort:      true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
}

let pool = null

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig)
    console.log("✅ Conectado a SQL Server —", config.db.database)
  }
  return pool
}

async function query(queryStr, params = {}) {
  const p   = await getPool()
  const req = p.request()
  for (const [key, val] of Object.entries(params)) req.input(key, val)
  return req.query(queryStr)
}

async function exec(spName, params = {}) {
  const p   = await getPool()
  const req = p.request()
  for (const [key, val] of Object.entries(params)) req.input(key, val)
  return req.execute(spName)
}

module.exports = { sql, getPool, query, exec }