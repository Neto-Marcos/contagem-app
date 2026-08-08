import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
if (!SECRET) throw new Error('JWT_SECRET não configurado')

export function assinarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, empresaId: usuario.empresa_id, role: usuario.role, nome: usuario.nome, email: usuario.email },
    SECRET,
    { expiresIn: '30d' },
  )
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ erro: 'Não autenticado.' })
  try {
    const payload = jwt.verify(token, SECRET)
    req.usuario = { id: payload.sub, empresaId: payload.empresaId, role: payload.role, nome: payload.nome, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({ erro: 'Sem permissão para esta ação.' })
    }
    next()
  }
}
