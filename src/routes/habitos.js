const express            = require('express');
const { getDb, persist } = require('../db/connection');
const auth               = require('../middleware/auth');
const { calcStats }      = require('../utils/stats');
const { dbGet, dbAll, dbRun, today, isValidDate } = require('../utils/db');

const router = express.Router();
router.use(auth);

const getFechas = (db, habitoId) =>
  dbAll(db, 'SELECT fecha FROM completions WHERE habito_id = ?', [habitoId]).map(r => r.fecha);

// GET /api/habitos (devuelve todos para filtrar en el front y pintar el calendario)
router.get('/', (req, res) => {
  const db = getDb();
  const habitos = dbAll(db,
    'SELECT * FROM habitos WHERE usuario_id = ? ORDER BY created_at ASC',
    [req.usuario.id]
  );
  const targetDate = req.query.date && isValidDate(req.query.date) ? req.query.date : today();
  const result = habitos.map(h => ({ ...h, stats: calcStats(getFechas(db, h.id), targetDate) }));
  return res.json(result);
});

// POST /api/habitos
router.post('/', (req, res) => {
  const { titulo, tipo = 'recurrente', fecha_puntual } = req.body;
  if (!titulo?.trim()) return res.status(400).json({ error: 'Título obligatorio.' });
  if (tipo === 'puntual' && !isValidDate(fecha_puntual)) return res.status(400).json({ error: 'Falta fecha puntual.' });

  const db = getDb();
  const id = dbRun(db,
    'INSERT INTO habitos (titulo, usuario_id, tipo, fecha_puntual) VALUES (?, ?, ?, ?)',
    [titulo.trim(), req.usuario.id, tipo, fecha_puntual]
  );
  persist();
  const habito = dbGet(db, 'SELECT * FROM habitos WHERE id = ?', [id]);
  return res.status(201).json({ ...habito, stats: calcStats([], today()) });
});

// DELETE /api/habitos/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  dbRun(db, 'DELETE FROM habitos WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
  persist();
  return res.json({ ok: true });
});

// POST /api/habitos/:id/completar
router.post('/:id/completar', (req, res) => {
  const date = req.body.date && isValidDate(req.body.date) ? req.body.date : today();
  const db = getDb();
  const h = dbGet(db, 'SELECT * FROM habitos WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
  if (!h) return res.status(404).json({ error: 'Hábito no hallado.' });
  
  const existing = dbGet(db, 'SELECT * FROM completions WHERE habito_id = ? AND fecha = ?', [h.id, date]);
  if (existing) {
    db.run('DELETE FROM completions WHERE habito_id = ? AND fecha = ?', [h.id, date]);
  } else {
    db.run('INSERT OR IGNORE INTO completions (habito_id, fecha) VALUES (?, ?)', [h.id, date]);
  }
  
  persist();
  return res.json({ ok: true, stats: calcStats(getFechas(db, h.id), date) });
});

module.exports = router;