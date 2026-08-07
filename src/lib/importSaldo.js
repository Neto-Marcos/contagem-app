import * as XLSX from 'xlsx'
import { db, chaveProduto } from './db'

// Importa saldo a partir de Excel/CSV exportado do ERP.
// Colunas esperadas (nomes flexíveis, veja normalizeHeader): Filial, Codigo,
// Grade X (cor), Grade Y (voltagem), Produto, Saldo, Custo Medio.
// Para PDFs do ERP: exporte primeiro para Excel/CSV (o layout de PDF varia
// muito entre relatórios para um parser confiável de forma genérica) — ou
// cole os dados numa planilha simples com essas colunas.

function normalizeHeader(h) {
  return String(h)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
}

const HEADER_MAP = {
  'filial': 'filial', 'cod filial': 'filial',
  'codigo': 'codigo', 'cod produto': 'codigo', 'cod. produto': 'codigo',
  'cor': 'cor', 'grade x': 'cor',
  'voltagem': 'voltagem', 'grade y': 'voltagem',
  'produto': 'descricao', 'descricao': 'descricao',
  'saldo': 'saldo',
  'custo medio': 'custoMedio', 'custo médio': 'custoMedio',
}

export async function importarSaldoDeArquivo(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  if (rows.length === 0) throw new Error('Planilha vazia ou formato não reconhecido.')

  const mapped = rows.map((row) => {
    const out = {}
    for (const [key, val] of Object.entries(row)) {
      const norm = HEADER_MAP[normalizeHeader(key)]
      if (norm) out[norm] = val
    }
    return out
  }).filter(r => r.codigo != null)

  let inseridos = 0
  let atualizados = 0

  await db.transaction('rw', db.produtos, async () => {
    for (const r of mapped) {
      const codigo = String(r.codigo).trim()
      const cor = String(r.cor ?? '0').trim()
      const voltagem = String(r.voltagem ?? '0').trim()
      const chave = chaveProduto(codigo, cor, voltagem)
      const existente = await db.produtos.where('chave').equals(chave).first()
      const dados = {
        chave, codigo, cor, voltagem,
        descricao: r.descricao ? String(r.descricao).trim() : (existente?.descricao || ''),
        filial: r.filial != null ? String(r.filial).trim() : (existente?.filial || ''),
        saldo: Number(r.saldo) || 0,
        custoMedio: Number(r.custoMedio) || 0,
        atualizadoEm: new Date().toISOString(),
      }
      if (existente) {
        await db.produtos.update(existente.id, dados)
        atualizados++
      } else {
        await db.produtos.add(dados)
        inseridos++
      }
    }
  })

  return { total: mapped.length, inseridos, atualizados }
}
