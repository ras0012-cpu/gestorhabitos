require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb, applySchema } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS — orígenes permitidos desde .env o lista de desarrollo por defecto
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const DEV_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
];

const allowedList = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEV_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    // Permitir cualquier puerto local en desarrollo
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));

// Límite de 50kb para evitar payloads excesivos
app.use(express.json({ limit: '50kb' }));

// sql.js carga un WASM de forma asíncrona, esperamos antes de aceptar peticiones
initDb().then(() => {

  applySchema();

  // Las rutas se importan aquí para garantizar que getDb() ya esté listo
  const authRoutes = require('./routes/auth');
  const habitosRoutes = require('./routes/habitos');
  const notasRoutes = require('./routes/notas');

  app.use('/api/auth', authRoutes);
  app.use('/api/habitos', habitosRoutes);
  app.use('/api/notas', notasRoutes);

  app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('[error]', err.message || err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  app.listen(PORT, () => {
    console.log(`✓ Servidor en http://localhost:${PORT}`);
    console.log(`✓ CORS: ${allowedList.join(', ')}`);
  });

}).catch(err => {
  console.error('✗ Error al inicializar la base de datos:', err);
  process.exit(1);
});