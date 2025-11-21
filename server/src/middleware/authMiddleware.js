const jwt = require('jsonwebtoken')
const SECRET = 'gymsync-secret' // ok para un TP

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Formato de token inválido' })
  }

  try {
    const payload = jwt.verify(token, SECRET)
    req.user = { id: payload.id, role: payload.role }
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

module.exports = { authMiddleware, SECRET }
