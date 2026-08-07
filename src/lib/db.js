import Dexie from 'dexie'

// Banco de dados local (IndexedDB). Fonte da verdade no dispositivo —
// o app funciona inteiramente a partir daqui, sem depender de rede.
export const db = new Dexie('contagem_estoque')

db.version(1).stores({
  // código+cor+voltagem identifica uma variação única do produto
  produtos: '++id, &chave, codigo, cor, voltagem, descricao, filial',
  sessoes: '++id, filial, periodo, status, criadaEm',
  itens: '++id, sessaoId, produtoId, chave, diferenca, statusDivergencia',
  notasFiscais: '++id, itemId, numero, tipo, quantidade, data',
})

export const CATEGORIAS_DIVERGENCIA = [
  'Inversão',
  'NF a verificar',
  'Avaria',
  'Auditoria pendente',
  'Outro',
]

export const CAMPOS_MOVIMENTO = [
  { key: 'transferencia', label: 'Transferência' },
  { key: 'licitacao', label: 'Licitação' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'contagem', label: 'Contagem' },
  { key: 'auditoria', label: 'Auditoria' },
  { key: 'assistencia', label: 'Assistência' },
  { key: 'avaria', label: 'Avaria' },
  { key: 'entradaNf', label: 'Entrada NF' },
  { key: 'falta', label: 'Falta' },
]

export function chaveProduto(codigo, cor, voltagem) {
  return `${codigo}-${cor}-${voltagem}`
}

export function calcularTotal(item) {
  return CAMPOS_MOVIMENTO.reduce((soma, campo) => soma + (Number(item[campo.key]) || 0), 0)
}

export function calcularDiferenca(item, saldoSistema) {
  return calcularTotal(item) - (Number(saldoSistema) || 0)
}
