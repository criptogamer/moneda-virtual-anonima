const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yengcoin_855754454355',
  port: Number(process.env.DB_PORT) || 3306
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: false
    });
  }
  return pool;
}

async function initDB() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.end();
  return dbConfig;
}

async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function get(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows[0] || null;
}

async function all(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function transaction(work) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const tx = {
      run: (sql, params = []) => conn.execute(sql, params),
      get: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows[0] || null;
      },
      all: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows;
      }
    };
    const result = await work(tx);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { initDB, run, get, all, transaction, dbConfig };
