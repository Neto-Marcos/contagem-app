import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

export const produtosRouter = Router()
produtosRouter.use(requireAuth)

function chaveProduto(codigo, cor, voltagem) {
  return `${codigo}-${cor}-${voltagem}`
}

produtosRouter.get('/', async (req, res) => {
  const { filial } = req.query
  const params = [req.usuario.empresaId]
  let sql = 'SELECT * FROM produtos WHERE empresa_id = $1'
  if (filial) {
    params.push(filial)
    sql += ' AND filial = $2'
  }
  const result = await pool.query(sql, params)
  res.json(result.rows)
})

// Importa/atualiza em lote a partir da planilha já parseada no cliente.
produtosRouter.post('/import', requireRole('admin', 'operador'), async (req, res) => {
  const linhas = Array.isArray(req.body?.linhas) ? req.body.linhas : []
  if (linhas.length === 0) return res.status(400).json({ erro: 'Nenhuma linha para importar.' })

  const client = await pool.connect()
  let inseridos = 0
  let atualizados = 0
  try {
    await client.query('BEGIN')
    for (const r of linhas) {
      if (r.codigo == null) continue
      const codigo = String(r.codigo).trim()
      const cor = String(r.cor ?? '0').trim()
      const voltagem = String(r.voltagem ?? '0').trim()
      const chave = chaveProduto(codigo, cor, voltagem)
      const descricao = r.descricao != null ? String(r.descricao).trim() : ''
      const filial = r.filial != null ? String(r.filial).trim() : ''
      const saldo = Number(r.saldo) || 0
      const custoMedio = Number(r.custoMedio) || 0

      const result = await client.query(
        `INSERT INTO produtos (empresa_id, chave, codigo, cor, voltagem, descricao, filial, saldo, custo_medio, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         ON CONFLICT (empresa_id, chave) DO UPDATE SET
           codigo = EXCLUDED.codigo, cor = EXCLUDED.cor, voltagem = EXCLUDED.voltagem,
           descricao = CASE WHEN EXCLUDED.descricao <> '' THEN EXCLUDED.descricao ELSE produtos.descricao END,
           filial = CASE WHEN EXCLUDED.filial <> '' THEN EXCLUDED.filial ELSE produtos.filial END,
           saldo = EXCLUDED.saldo, custo_medio = EXCLUDED.custo_medio, atualizado_em = now()
         RETURNING (xmax = 0) AS inserido`,
        [req.usuario.empresaId, chave, codigo, cor, voltagem, descricao, filial, saldo, custoMedio],
      )
      if (result.rows[0].inserido) inseridos++
      else atualizados++
    }
    await client.query('COMMIT')
    res.json({ total: linhas.length, inseridos, atualizados })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ erro: 'Falha ao importar saldo.' })
  } finally {
    client.release()
  }
})
