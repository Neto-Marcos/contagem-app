import * as XLSX from 'xlsx'
import { api } from './api'

// Importa saldo a partir de Excel/CSV exportado do ERP.
// Colunas esperadas (nomes flexíveis, veja normalizeHeader): Filial, Codigo,
// Grade X (cor), Grade Y (voltagem), Produto, Saldo, Custo Medio.
// Para PDFs do ERP: exporte primeiro para Excel/CSV (o layout de PDF varia
// muito entre relatórios para um parser confiável de forma genérica) — ou
// cole os dados numa planilha simples com essas colunas.

function normalizeHeader(h) {
  return String(h)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
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

  const linhas = rows.map((row) => {
    const out = {}
    for (const [key, val] of Object.entries(row)) {
      const norm = HEADER_MAP[normalizeHeader(key)]
      if (norm) out[norm] = val
    }
    return out
  }).filter(r => r.codigo != null)

  if (linhas.length === 0) throw new Error('Nenhuma linha com código de produto reconhecida.')

  return api.importarProdutos(linhas)
}
