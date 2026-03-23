// ─────────────────────────────────────────────
// db/schema.js
// Crea las tablas de la BD si no existen todavía.
// Se ejecuta UNA vez al arrancar el servidor,
// justo después de que initDb() abra el fichero.
// ─────────────────────────────────────────────

const { getDb, initDb, persist } = require('./connection');

const applySchema = () => {
  const db = getDb();

  // ── Usuarios ────────────────────────────────
  // Almacena credenciales. El email es UNIQUE para
  // evitar registros duplicados a nivel de BD.
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,              -- hash bcrypt, nunca texto plano
      created_at TEXT    NOT NULL DEFAULT (date('now'))
    );
  `);

  // ── Hábitos ─────────────────────────────────
  // Cada hábito pertenece a un usuario.
  // ON DELETE CASCADE borra los hábitos si se borra el usuario.
  db.run(`
    CREATE TABLE IF NOT EXISTS habitos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo     TEXT    NOT NULL,
      usuario_id INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Completions ──────────────────────────────
  // Un registro por (hábito, día). UNIQUE impide
  // marcar el mismo hábito dos veces en la misma fecha.
  db.run(`
    CREATE TABLE IF NOT EXISTS completions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      habito_id INTEGER NOT NULL,
      fecha     TEXT    NOT NULL,               -- formato ISO: 'YYYY-MM-DD'
      UNIQUE (habito_id, fecha),
      FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE
    );
  `);

  // ── Notas diarias ────────────────────────────
  // Diario personal: una entrada por usuario por día.
  // UNIQUE (usuario_id, fecha) garantiza que no haya
  // dos entradas del mismo usuario para el mismo día.
  // La puntuación va de 1 a 5 (estado de ánimo).
  db.run(`
    CREATE TABLE IF NOT EXISTS notas_diarias (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha      TEXT    NOT NULL,              -- 'YYYY-MM-DD'
      texto      TEXT    NOT NULL DEFAULT '',   -- reflexión libre del usuario
      puntuacion INTEGER NOT NULL DEFAULT 3     -- estado de ánimo: 1 (mal) → 5 (excelente)
        CHECK (puntuacion >= 1 AND puntuacion <= 5),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, fecha),
      FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Guardamos la BD en disco después de aplicar el schema
  // por si es la primera vez que se ejecuta y las tablas
  // acaban de crearse en memoria.
  persist();
};

// Re-exportamos initDb para que server.js solo necesite
// importar desde este módulo (un único punto de entrada para la BD).
module.exports = { initDb, applySchema };