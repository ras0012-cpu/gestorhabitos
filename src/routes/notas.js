// routes/notas.js — Diario personal. Una nota por día: texto + puntuación 1-5.
//
// GET    /api/notas        → todas las notas del usuario
// GET    /api/notas/hoy   → nota de hoy (o null)
// GET    /api/notas/:fecha → nota de una fecha concreta (YYYY-MM-DD)
// POST   /api/notas        → crea o actualiza la nota de hoy (upsert)
// DELETE /api/notas/:fecha → elimina la nota de esa fecha

const express            = require('express');
const { getDb, persist } = require('../db/connection');
const auth               = require('../middleware/auth');
const { dbGet, dbAll, dbRun, today, isValidDate } = require('../utils/db');

const router = express.Router();
router.use(auth);

const NOTA_FIELDS = 'id, fecha, texto, puntuacion, created_at, updated_at';

// GET /api/notas
router.get('/', (req, res) => {
  const db    = getDb();
  const notas = dbAll(db,
    `SELECT ${NOTA_FIELDS} FROM notas_diarias WHERE usuario_id = ? ORDER BY fecha DESC`,
    [req.usuario.id]
  );
  return res.json(notas);
});

// GET /api/notas/hoy
router.get('/hoy', (req, res) => {
  const db   = getDb();
  const nota = dbGet(db,
    `SELECT ${NOTA_FIELDS} FROM notas_diarias WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, today()]
  );
  return res.json(nota || null);
});

// GET /api/notas/:fecha
router.get('/:fecha', (req, res) => {
  const { fecha } = req.params;
  if (!isValidDate(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  const db   = getDb();
  const nota = dbGet(db,
    `SELECT ${NOTA_FIELDS} FROM notas_diarias WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, fecha]
  );
  if (!nota) return res.status(404).json({ error: 'No hay nota para esa fecha.' });
  return res.json(nota);
});

// POST /api/notas (upsert)
router.post('/', (req, res) => {
  const { texto = '', puntuacion, fecha } = req.body;
  const fechaNota = fecha || today();

  if (!isValidDate(fechaNota))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  const puntInt = parseInt(puntuacion, 10);
  if (isNaN(puntInt) || puntInt < 1 || puntInt > 5)
    return res.status(400).json({ error: 'La puntuación debe ser un número entre 1 y 5.' });

  if (texto.length > 2000)
    return res.status(400).json({ error: 'El texto no puede superar 2000 caracteres.' });

  const db        = getDb();
  const existente = dbGet(db,
    'SELECT id FROM notas_diarias WHERE usuario_id = ? AND fecha = ?',
    [req.usuario.id, fechaNota]
  );

  if (existente) {
    db.run(
      `UPDATE notas_diarias SET texto = ?, puntuacion = ?, updated_at = datetime('now')
       WHERE usuario_id = ? AND fecha = ?`,
      [texto.trim(), puntInt, req.usuario.id, fechaNota]
    );
  } else {
    dbRun(db,
      'INSERT INTO notas_diarias (usuario_id, fecha, texto, puntuacion) VALUES (?, ?, ?, ?)',
      [req.usuario.id, fechaNota, texto.trim(), puntInt]
    );
  }

  persist();

  const nota = dbGet(db,
    `SELECT ${NOTA_FIELDS} FROM notas_diarias WHERE usuario_id = ? AND fecha = ?`,
    [req.usuario.id, fechaNota]
  );
  return res.status(existente ? 200 : 201).json(nota);
});

// DELETE /api/notas/:fecha
router.delete('/:fecha', (req, res) => {
  const { fecha } = req.params;
  if (!isValidDate(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });

  const db   = getDb();
  const nota = dbGet(db,
    'SELECT id FROM notas_diarias WHERE usuario_id = ? AND fecha = ?',
    [req.usuario.id, fecha]
  );
  if (!nota) return res.status(404).json({ error: 'No hay nota para esa fecha.' });

  db.run('DELETE FROM notas_diarias WHERE id = ?', [nota.id]);
  persist();
  return res.json({ ok: true, fecha });
});

module.exports = router;