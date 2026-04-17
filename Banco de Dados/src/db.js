require('dotenv').config();
const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (pool) return pool;

  const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
  const ssl = sslEnabled
    ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true' }
    : undefined;

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    ssl,
  });

  return pool;
}

module.exports = { getPool };
