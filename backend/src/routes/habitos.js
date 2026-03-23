// ─────────────────────────────────────────────
// routes/habitos.js
// CRUD completo de hábitos + marcado de completados.
// Todas las rutas están protegidas por el middleware auth.
//
// GET    /api/habitos           → lista hábitos del usuario con stats
// POST   /api/habitos           → crea un hábito nuevo
// DELETE /api/habitos/:id       → elimina un hábito y su historial
// POST   /api/habitos/:id/completar → marca el hábito como hecho hoy
// GET    /api/habitos/:id/stats → stats detalladas de un hábito
// ─────────────────────────────────────────────

const express        = require('express');
const { getDb, persist } = require('../db/connection');
const auth           = require('../middleware/auth');
const { calcStats }  = require('../utils/stats');

const router = express.Router();

// Todas las rutas de hábitos requieren token válido
router.use(auth);

/** Devuelve la fecha de hoy en formato 'YYYY-MM-DD' (UTC) */
const today = () => new Date().toISOString().split('T')[0];

// ── Helpers sql.js ───────────────────────────

/** Devuelve la primera fila de una SELECT, o null si no hay resultados */
const dbGet = (db, sql, params = []) => {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
};

/** Devuelve todas las filas de una SELECT como array de objetos */
const dbAll = (db, sql, params = []) => {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

/** Ejecuta un INSERT/UPDATE/DELETE y devuelve el id del último registro */
const dbRun = (db, sql, params = []) => {
  db.run(sql, params);
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
};

/**
 * Obtiene todas las fechas de completado de un hábito.
 * Se usa para calcular stats (rachas, porcentajes, etc.)
 */
const getFechas = (db, habitoId) =>
  dbAll(db, 'SELECT fecha FROM completions WHERE habito_id = ?', [habitoId])
    .map(r => r.fecha);

// ── GET /api/habitos ─────────────────────────
// Devuelve todos los hábitos del usuario, cada uno
// con sus estadísticas calculadas al vuelo.
router.get('/', (req, res) => {
  const db      = getDb();
  const habitos = dbAll(db,
    'SELECT * FROM habitos WHERE usuario_id = ? ORDER BY created_at ASC',
    [req.usuario.id]
  );

  // Para cada hábito, obtenemos sus fechas y calculamos las stats
  const result = habitos.map(h => ({
    ...h,
    stats: calcStats(getFechas(db, h.id), today()),
  }));

  return res.json(result);
});

// ── POST /api/habitos ────────────────────────
// Crea un hábito nuevo para el usuario autenticado.
router.post('/', (req, res) => {
  const { titulo } = req.body;

  if (!titulo || !titulo.trim())
    return res.status(400).json({ error: 'El título es obligatorio.' });

  if (titulo.trim().length > 80)
    return res.status(400).json({ error: 'El título no puede superar 80 caracteres.' });

  const db = getDb();
  const id = dbRun(db,
    'INSERT INTO habitos (titulo, usuario_id) VALUES (?, ?)',
    [titulo.trim(), req.usuario.id]
  );
  persist();

  // Devolvemos el hábito recién creado con stats vacías
  const habito = dbGet(db, 'SELECT * FROM habitos WHERE id = ?', [id]);
  return res.status(201).json({ ...habito, stats: calcStats([], today()) });
});

// ── DELETE /api/habitos/:id ──────────────────
// Elimina un hábito y todo su historial.
// La FK con ON DELETE CASCADE en completions se encarga
// de borrar las entradas de completions automáticamente.
router.delete('/:id', (req, res) => {
  const db     = getDb();
  const habito = dbGet(db,
    'SELECT * FROM habitos WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.usuario.id]
  );

  // Verificamos que el hábito existe Y pertenece al usuario (evita borrar de otros)
  if (!habito) return res.status(404).json({ error: 'Hábito no encontrado.' });

  db.run('DELETE FROM habitos WHERE id = ?', [habito.id]);
  persist();
  return res.json({ ok: true });
});

// ── POST /api/habitos/:id/completar ──────────
// Marca el hábito como completado hoy.
// INSERT OR IGNORE evita duplicados si se llama dos veces el mismo día.
router.post('/:id/completar', (req, res) => {
  const db     = getDb();
  const habito = dbGet(db,
    'SELECT * FROM habitos WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.usuario.id]
  );

  if (!habito) return res.status(404).json({ error: 'Hábito no encontrado.' });

  // INSERT OR IGNORE: si ya existe (habito_id, fecha), no hace nada
  db.run(
    'INSERT OR IGNORE INTO completions (habito_id, fecha) VALUES (?, ?)',
    [habito.id, today()]
  );
  persist();

  // Devolvemos las stats actualizadas para que el frontend se refresque
  const stats = calcStats(getFechas(db, habito.id), today());
  return res.json({ ok: true, stats });
});

// ── GET /api/habitos/:id/stats ────────────────
// Stats detalladas de un hábito específico.
// Útil si en el futuro quieres una pantalla de detalle.
router.get('/:id/stats', (req, res) => {
  const db     = getDb();
  const habito = dbGet(db,
    'SELECT * FROM habitos WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.usuario.id]
  );

  if (!habito) return res.status(404).json({ error: 'Hábito no encontrado.' });

  return res.json(calcStats(getFechas(db, habito.id), today()));
});

module.exports = router;