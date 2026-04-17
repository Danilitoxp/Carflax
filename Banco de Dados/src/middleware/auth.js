const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Rotas públicas que não precisam de token
const PUBLIC_ROUTES = ['/api/health'];

module.exports = function verificarToken(req, res, next) {
  if (PUBLIC_ROUTES.includes(req.path)) return next();

  if (!JWT_SECRET) {
    console.error('[AUTH] JWT_SECRET não configurado — defina no .env');
    return res.status(500).json({ error: 'Servidor mal configurado' });
  }

  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Campos esperados no payload do token: cod_vendedor, nome, empresa
    req.user = {
      cod_vendedor: payload.cod_vendedor || null,
      nome:         payload.nome         || null,
      empresa:      payload.empresa      || '001',
      perfil:       payload.perfil       || 'vendedor', // 'vendedor' | 'gerente' | 'admin'
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};
