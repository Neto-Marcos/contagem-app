// Constantes e cálculos compartilhados pelas telas de contagem.
// Os dados em si (produtos, sessões, itens) vivem no backend/Postgres,
// escopados por empresa — veja src/lib/api.js.

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
  { key: 'entrada_nf', label: 'Entrada NF' },
  { key: 'falta', label: 'Falta' },
]

export function calcularTotal(item) {
  return CAMPOS_MOVIMENTO.reduce((soma, campo) => soma + (Number(item[campo.key]) || 0), 0)
}

export function calcularDiferenca(item, saldoSistema) {
  return calcularTotal(item) - (Number(saldoSistema) || 0)
}
