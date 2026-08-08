import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CAMPOS_MOVIMENTO, calcularTotal } from './db'

function montarLinhas(sessao) {
  return (sessao.itens || []).map((item) => ({
    Código: item.codigo ?? '',
    Cor: item.cor ?? '',
    Voltagem: item.voltagem ?? '',
    Produto: item.descricao ?? '',
    ...Object.fromEntries(CAMPOS_MOVIMENTO.map(c => [c.label, item[c.key] || 0])),
    'C. Total': calcularTotal(item),
    Saldo: item.saldo ?? 0,
    Diferença: item.diferenca ?? 0,
    Categoria: item.categoria_divergencia || '',
    OBS: item.observacao || '',
  }))
}

export function exportarExcel(sessao, nomeArquivo = 'contagem.xlsx') {
  const linhas = montarLinhas(sessao)
  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contagem')
  XLSX.writeFile(wb, nomeArquivo)
}

export function exportarPDF(sessao, nomeArquivo = 'contagem.pdf', titulo = 'Relatório de Contagem') {
  const linhas = montarLinhas(sessao)
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
