import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

export const sessoesRouter = Router()
sessoesRouter.use(requireAuth)

const CAMPOS_MOVIMENTO = [
  'transferencia', 'licitacao', 'clientes', 'contagem', 'auditoria',
  'assistencia', 'avaria', 'entrada_nf', 'falta',
]

sessoesRouter.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM sessoes WHERE empresa_id = $1 ORDER BY criada_em DESC',
    [req.usuario.empresaId],
  )
  res.json(result.rows)
})

sessoesRouter.post('/', requireRole('admin', 'operador'), async (req, res) => {
  const { filial, periodo } = req.body || {}
  if (!filial || !periodo) return res.status(400).json({ erro: 'Informe filial e período.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sessao = await client.query(
      `INSERT INTO sessoes (empresa_id, filial, periodo, status) VALUES ($1, $2, $3, 'aberta') RETURNING *`,
      [req.usuario.empresaId, String(filial).trim(), String(periodo).trim()],
    )
    const produtos = await client.query(
      'SELECT * FROM produtos WHERE empresa_id = $1 AND filial = $2',
      [req.usuario.empresaId, String(filial).trim()],
    )
    for (const p of produtos.rows) {
      await client.query(
        `INSERT INTO itens (sessao_id, produto_id, chave, diferenca, status_divergencia)
         VALUES ($1, $2, $3, $4, 'pendente')`,
        [sessao.rows[0].id, p.id, p.chave, -Number(p.saldo)],
      )
    }
    await client.query('COMMIT')
    res.status(201).json(sessao.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ erro: 'Falha ao criar sessão.' })
  } finally {
    client.release()
  }
})

async function carregarSessao(empresaId, sessaoId) {
  const sessao = await pool.query(
    'SELECT * FROM sessoes WHERE id = $1 AND empresa_id = $2',
    [sessaoId, empresaId],
  )
  return sessao.rows[0]
}

sessoesRouter.get('/:id', async (req, res) => {
  const sessao = await carregarSessao(req.usuario.empresaId, req.params.id)
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' })

  const itens = await pool.query(
    `SELECT i.*, p.codigo, p.cor, p.voltagem, p.descricao, p.saldo
     FROM itens i JOIN produtos p ON p.id = i.produto_id
     WHERE i.sessao_id = $1 ORDER BY p.codigo`,
    [sessao.id],
  )
  res.json({ ...sessao, itens: itens.rows })
})

sessoesRouter.patch('/:id', requireRole('admin', 'operador'), async (req, res) => {
  const sessao = await carregarSessao(req.usuario.empresaId, req.params.id)
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' })

  if (req.body?.status === 'fechada') {
    const pendentes = await pool.query(
      `SELECT count(*) FROM itens WHERE sessao_id = $1 AND diferenca <> 0 AND categoria_divergencia = ''`,
      [sessao.id],
    )
    if (Number(pendentes.rows[0].count) > 0) {
      return res.status(400).json({ erro: 'Há divergências sem categoria. Classifique antes de fechar.' })
    }
    const result = await pool.query(
      `UPDATE sessoes SET status = 'fechada' WHERE id = $1 RETURNING *`,
      [sessao.id],
    )
    return res.json(result.rows[0])
  }
  res.status(400).json({ erro: 'Alteração não suportada.' })
})

sessoesRouter.patch('/:id/itens/:itemId', requireRole('admin', 'operador'), async (req, res) => {
  const sessao = await carregarSessao(req.usuario.empresaId, req.params.id)
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' })

  const item = await pool.query(
    `SELECT i.*, p.saldo FROM itens i JOIN produtos p ON p.id = i.produto_id
     WHERE i.id = $1 AND i.sessao_id = $2`,
    [req.params.itemId, sessao.id],
  )
  if (!item.rows[0]) return res.status(404).json({ erro: 'Item não encontrado.' })
  const atual = item.rows[0]

  const patch = req.body || {}
  const campos = {}
  for (const c of CAMPOS_MOVIMENTO) {
    if (patch[c] !== undefined) campos[c] = Number(patch[c]) || 0
  }
  if (patch.categoriaDivergencia !== undefined) campos.categoria_divergencia = String(patch.categoriaDivergencia)
  if (patch.observacao !== undefined) campos.observacao = String(patch.observacao)

  const mesclado = { ...atual, ...campos }
  const total = CAMPOS_MOVIMENTO.reduce((soma, c) => soma + Number(mesclado[c] || 0), 0)
  const diferenca = total - Number(atual.saldo || 0)
  campos.diferenca = diferenca
  campos.status_divergencia = diferenca === 0 ? 'ok' : (atual.status_divergencia === 'ok' ? 'pendente' : atual.status_divergencia)

  const colunas = Object.keys(campos)
  const valores = Object.values(campos)
  const set = colunas.map((c, i) => `${c} = $${i + 1}`).join(', ')
  await pool.query(`UPDATE itens SET ${set} WHERE id = $${colunas.length + 1}`, [...valores, req.params.itemId])

  const result = await pool.query(
    `SELECT i.*, p.codigo, p.cor, p.voltagem, p.descricao, p.saldo
     FROM itens i JOIN produtos p ON p.id = i.produto_id WHERE i.id = $1`,
    [req.params.itemId],
  )
  res.json(result.rows[0])
})
