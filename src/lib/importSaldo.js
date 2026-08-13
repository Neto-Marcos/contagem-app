import * as XLSX from 'xlsx'
import { api } from './api'
import { normalizarLinhaPlanilha } from './saldoParser'

const EXTENSOES_SUPORTADAS = new Set(['pdf', 'xlsx', 'xls', 'csv'])

function extensaoDoArquivo(file) {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

function extrairLinhasDaPlanilha(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  if (rows.length === 0) {
    throw new Error('Planilha vazia ou formato não reconhecido.')
  }

  return rows
    .map(normalizarLinhaPlanilha)
    .filter((linha) => linha.codigo != null && String(linha.codigo).trim() !== '')
}

export async function importarSaldoDeArquivo(file) {
  const extensao = extensaoDoArquivo(file)
  if (!EXTENSOES_SUPORTADAS.has(extensao)) {
    throw new Error('Formato não aceito. Selecione um arquivo PDF, Excel ou CSV.')
  }

  let linhas
  if (extensao === 'pdf') {
    const { extrairLinhasDoPdf } = await import('./pdfSaldo')
    linhas = await extrairLinhasDoPdf(file)
  } else {
    linhas = extrairLinhasDaPlanilha(await file.arrayBuffer())
  }

  if (linhas.length === 0) {
    throw new Error('Nenhuma linha com código de produto reconhecida.')
  }

  return api.importarProdutos(linhas)
}
