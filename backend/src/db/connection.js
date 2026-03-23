// ─────────────────────────────────────────────
// db/connection.js
// Conexión SQLite usando sql.js (sin compilación nativa).
//
// ¿Por qué sql.js?
//   El paquete better-sqlite3 (más común) requiere compilar
//   binarios nativos, lo que puede fallar en Windows con
//   restricciones de seguridad. sql.js es puro JavaScript/WASM,
//   así que funciona en cualquier entorno sin compilación.
//
// Trade-off:
//   sql.js trabaja en MEMORIA. Los datos se cargan del disco
//   al arrancar y se guardan con persist() después de cada
//   escritura. Si el proceso muere sin llamar persist(),
//   se pierden los últimos cambios.
// ─────────────────────────────────────────────

require('dotenv').config();
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

// Ruta al fichero .db en disco. Configurable via .env.
const DB_PATH = path.resolve(process.env.DB_PATH || './habitos.db');

let _db    = null;  // instancia de la BD en memoria
let _ready = false; // flag para evitar inicializar dos veces

/**
 * Devuelve la instancia activa de la BD.
 * Lanza error si se llama antes de initDb().
 * @returns {Database}
 */
const getDb = () => {
  if (!_db) throw new Error('Base de datos no inicializada. Llama a initDb() primero.');
  return _db;
};

/**
 * Serializa la BD en memoria y la escribe en el fichero .db del disco.
 * Debe llamarse después de CADA operación de escritura (INSERT, UPDATE, DELETE)
 * para garantizar que los datos no se pierdan si el proceso se reinicia.
 */
const persist = () => {
  const data = _db.export(); // Uint8Array con el binario de SQLite
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

/**
 * Inicializa sql.js y carga (o crea) el fichero de BD.
 * Es asíncrona porque sql.js carga un módulo WASM al arrancar.
 * Se llama una sola vez en server.js antes de aceptar peticiones.
 */
const initDb = async () => {
  if (_ready) return; // idempotente — seguro llamar varias veces

  const SQL = await initSqlJs(); // carga el WASM de sql.js

  if (fs.existsSync(DB_PATH)) {
    // Si el fichero ya existe, lo leemos y lo cargamos en memoria
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    // Primera vez: creamos una BD vacía en memoria
    // (persist() la escribirá en disco al aplicar el schema)
    _db = new SQL.Database();
  }

  // Activa el soporte de claves foráneas (ON DELETE CASCADE, etc.)
  // SQLite lo tiene desactivado por defecto por compatibilidad histórica
  _db.run('PRAGMA foreign_keys = ON;');

  _ready = true;
};

module.exports = { getDb, persist, initDb };