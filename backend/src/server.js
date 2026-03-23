// ─────────────────────────────────────────────
// server.js
// Punto de entrada del servidor Express.
//
// Orden de arranque:
//   1. Carga variables de entorno (.env)
//   2. Inicializa la BD en memoria (sql.js)
//   3. Aplica el schema (crea tablas si no existen)
//   4. Registra middlewares globales (CORS, JSON)
//   5. Monta las rutas de la API
//   6. Arranca el servidor HTTP
// ─────────────────────────────────────────────

require('dotenv').config(); // carga .env antes que nada

const express = require('express');
const cors    = require('cors');
const { initDb, applySchema } = require('./db/schema');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── CORS ─────────────────────────────────────
// Permite peticiones desde el frontend.
// En desarrollo aceptamos múltiples orígenes comunes;
// en producción restringe a tu dominio real.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Si no se configuró CORS_ORIGIN, usamos defaults de desarrollo
const DEV_ORIGINS = [
  'http://localhost:5500',   // Live Server de VS Code
  'http://127.0.0.1:5500',
  'http://localhost:5173',   // Vite
  'http://127.0.0.1:5173',
  'http://localhost:3001',   // otro puerto local habitual
];

const allowedList = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEV_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    // Permitimos peticiones sin origin (Postman, curl, apps móviles)
    if (!origin) return callback(null, true);
    if (allowedList.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true, // necesario si el frontend envía cookies o cabeceras de auth
}));

// ── Body parser ───────────────────────────────
// Parsea el body de las peticiones como JSON.
// limit evita ataques con payloads enormes.
app.use(express.json({ limit: '50kb' }));

// ── Arranque asíncrono ────────────────────────
// initDb() es async porque sql.js carga un WASM,
// así que debemos esperar a que esté listo antes
// de aceptar peticiones.
initDb().then(() => {

  // Crea las tablas si no existen (operación idempotente)
  applySchema();

  // ── Rutas ──────────────────────────────────
  // Importamos las rutas DESPUÉS de initDb para garantizar
  // que getDb() no lance error al requerir los módulos.
  const authRoutes    = require('./routes/auth');
  const habitosRoutes = require('./routes/habitos');
  const notasRoutes   = require('./routes/notas');

  app.use('/api/auth',    authRoutes);
  app.use('/api/habitos', habitosRoutes);
  app.use('/api/notas',   notasRoutes);   // ← nuevo: diario personal

  // ── Health check ───────────────────────────
  // Endpoint simple para comprobar que el servidor está vivo.
  // Útil para monitoreo o simplemente para verificar que arrancó bien.
  app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // ── Error handler global ───────────────────
  // Captura cualquier error no controlado en las rutas.
  // Siempre debe ir AL FINAL, después de todas las rutas.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('[error global]', err.message || err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  // ── Arranque ───────────────────────────────
  app.listen(PORT, () => {
    console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`✓ CORS permitido para: ${allowedList.join(', ')}`);
  });

}).catch(err => {
  // Si la BD no arranca, no tiene sentido seguir
  console.error('✗ Error al inicializar la base de datos:', err);
  process.exit(1);
});