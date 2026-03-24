// db/connection.js — Conexión SQLite con sql.js (WASM, sin binarios nativos).
//
// sql.js trabaja en MEMORIA: los datos se cargan del disco al arrancar
// y se guardan con persist() después de cada escritura.

require('dotenv').config();
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || './habitos.db');

let _db    = null;
let _ready = false;

/** Devuelve la instancia activa de la BD. Lanza si se llama antes de initDb(). */
const getDb = () => {
  if (!_db) throw new Error('Base de datos no inicializada. Llama a initDb() primero.');
  return _db;
};

/** Serializa la BD en memoria y la escribe en disco. Llamar tras cada escritura. */
const persist = () => {
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
};

/** Inicializa sql.js y carga (o crea) el fichero de BD. Solo se ejecuta una vez. */
const initDb = async () => {
  if (_ready) return;

  const SQL = await initSqlJs();

  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  // SQLite desactiva foreign keys por defecto — lo activamos explícitamente
  _db.run('PRAGMA foreign_keys = ON;');
  _ready = true;
};

module.exports = { getDb, persist, initDb };