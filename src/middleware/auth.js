// middleware/auth.js — Protege rutas verificando el JWT en Authorization: Bearer <token>

const { verify } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido.' });

  try {
    req.usuario = verify(header.split(' ')[1]);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado.' : 'Token inválido.';
    return res.status(401).json({ error: msg });
  }
};

module.exports = authMiddleware;