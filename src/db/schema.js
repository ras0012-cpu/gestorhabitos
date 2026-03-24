const { getDb, initDb, persist } = require('./connection');

const applySchema = () => {
  const db = getDb();

  // Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (date('now'))
    );
  `);

  // Hábitos (recurrentes y puntuales)
  db.run(`
    CREATE TABLE IF NOT EXISTS habitos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo        TEXT    NOT NULL,
      usuario_id    INTEGER NOT NULL,
      tipo          TEXT    NOT NULL DEFAULT 'recurrente', -- 'recurrente' | 'puntual'
      fecha_puntual TEXT,                                  -- 'YYYY-MM-DD' para puntuales
      created_at    TEXT    NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migraciones para instalaciones previas
  try { db.run("ALTER TABLE habitos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'recurrente';"); } catch(e){}
  try { db.run("ALTER TABLE habitos ADD COLUMN fecha_puntual TEXT;"); } catch(e){}

  // Completions (una por hábito y fecha)
  db.run(`
    CREATE TABLE IF NOT EXISTS completions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      habito_id INTEGER NOT NULL,
      fecha     TEXT    NOT NULL,
      UNIQUE (habito_id, fecha),
      FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE
    );
  `);

  // Notas diarias
  db.run(`
    CREATE TABLE IF NOT EXISTS notas_diarias (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha      TEXT    NOT NULL,
      texto      TEXT    NOT NULL DEFAULT '',
      puntuacion INTEGER NOT NULL DEFAULT 3 CHECK (puntuacion >= 1 AND puntuacion <= 5),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, fecha),
      FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  persist();
};

module.exports = { initDb, applySchema };