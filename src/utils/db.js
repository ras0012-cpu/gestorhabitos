// utils/db.js — Helpers compartidos de sql.js para todas las rutas.

/**
 * Devuelve la primera fila de una SELECT, o null.
 */
const dbGet = (db, sql, params = []) => {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
};

/**
 * Devuelve todas las filas de una SELECT como array de objetos.
 */
const dbAll = (db, sql, params = []) => {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

/**
 * Ejecuta INSERT/UPDATE/DELETE y devuelve el id del último registro insertado.
 */
const dbRun = (db, sql, params = []) => {
  db.run(sql, params);
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
};

/** Fecha de hoy en formato ISO 'YYYY-MM-DD' (UTC). */
const today = () => new Date().toISOString().split('T')[0];

/** Valida que un string tenga formato YYYY-MM-DD. */
const isValidDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

module.exports = { dbGet, dbAll, dbRun, today, isValidDate };
