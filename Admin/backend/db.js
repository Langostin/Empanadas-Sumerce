// backend/db.js
const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user:     process.env.DB_USER     || "sa",
  password: process.env.DB_PASSWORD || "TuPassword123",
  server:   process.env.DB_SERVER   || "localhost",
  database: process.env.DB_NAME     || "EmpanadasSuMerce",
  port:     parseInt(process.env.DB_PORT || "1433"),
  options:  { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  pool:     { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    console.log("✅ Conectado a SQL Server");
  }
  return pool;
}

async function q(query, params = {}) {
  const p   = await getPool();
  const req = p.request();
  Object.entries(params).forEach(([k, v]) => req.input(k, v));
  return req.query(query);
}

module.exports = { sql, getPool, q };