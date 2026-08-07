import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db, CAMPOS_MOVIMENTO, calcularTotal } from './db'

async function montarLinhas(sessaoId) {
  const itens = await db.itens.where('sessaoId').equals(sessaoId).toArray()
  const linhas = []
  for (const item of itens) {
    const produto = await db.produtos.get(item.produtoId)
    const nfs = await db.notasFiscais.where('itemId').equals(item.id).toArray()
    linhas.push({
      Código: produto?.codigo ?? '',
      Cor: produto?.cor ?? '',
      Voltagem: produto?.voltagem ?? '',
      Produto: produto?.descricao ?? '',
      ...Object.fromEntries(CAMPOS_MOVIMENTO.map(c => [c.label, item[c.key] || 0])),
      'C. Total': calcularTotal(item),
      Saldo: produto?.saldo ?? 0,
      Diferença: item.diferenca ?? 0,
      Categoria: item.categoriaDivergencia || '',
      OBS: item.observacao || '',
      'NF vinculadas': nfs.map(n => `${n.tipo === 'entrada' ? 'Ent' : 'Sai'} ${n.numero} (${n.quantidade})`).join('; '),
    })
  }
  return linhas
}

export async function exportarExcel(sessaoId, nomeArquivo = 'contagem.xlsx') {
  const linhas = await montarLinhas(sessaoId)
  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contagem')
  XLSX.writeFile(wb, nomeArquivo)
}

export async function exportarPDF(sessaoId, nomeArquivo = 'contagem.pdf', titulo = 'Relatório de Contagem') {
  const linhas = await montarLinhas(sessaoId)
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(titulo, 14, 14)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleString('pt-BR'), 14, 20)

  const cols = Object.keys(linhas[0] || { Código: '' })
  autoTable(doc, {
    startY: 26,
    head: [cols],
    body: linhas.map(l => cols.map(c => String(l[c] ?? ''))),
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [31, 59, 87] },
    didParseCell: (data) => {
      if (data.section === 'body' && cols[data.column.index] === 'Diferença') {
        const v = Number(data.cell.raw)
        if (v !== 0) data.cell.styles.textColor = [180, 30, 30]
      }
    },
  })
  doc.save(nomeArquivo)
}
