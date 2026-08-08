import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { assinarToken } from '../auth.js'

export const authRouter = Router()

authRouter.post('/registro', async (req, res) => {
  const { empresaNome, nome, email, senha } = req.body || {}
  if (!empresaNome || !nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha empresa, nome, e-mail e senha.' })
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ erro: 'Senha precisa ter ao menos 6 caracteres.' })
  }

  const emailNorm = String(email).trim().toLowerCase()
  const client = await pool.connect()
  try {
    const existente = await client.query('SELECT id FROM usuarios WHERE email = $1', [emailNorm])
    if (existente.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' })
    }

    await client.query('BEGIN')
    const empresa = await client.query(
      'INSERT INTO empresas (nome) VALUES ($1) RETURNING *',
      [String(empresaNome).trim()],
    )
    const senhaHash = await bcrypt.hash(senha, 10)
    const usuario = await client.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING *`,
      [empresa.rows[0].id, String(nome).trim(), emailNorm, senhaHash],
    )
    await client.query('COMMIT')

    const token = assinarToken(usuario.rows[0])
    res.status(201).json({ token, empresa: { id: empresa.rows[0].id, nome: empresa.rows[0].nome } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ erro: 'Falha ao criar conta.' })
  } finally {
    client.release()
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, senha } = req.body || {}
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' })

  const emailNorm = String(email).trim().toLowerCase()
  const result = await pool.query(
    `SELECT u.*, e.nome AS empresa_nome FROM usuarios u
     JOIN empresas e ON e.id = u.empresa_id WHERE u.email = $1`,
    [emailNorm],
  )
  const usuario = result.rows[0]
  if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })

  const ok = await bcrypt.compare(senha, usuario.senha_hash)
  if (!ok) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })

  const token = assinarToken(usuario)
  res.json({ token, empresa: { id: usuario.empresa_id, nome: usuario.empresa_nome } })
})
