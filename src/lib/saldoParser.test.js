import test from 'node:test'
import assert from 'node:assert/strict'
import {
  converterNumero,
  extrairLinhasPosicionadas,
  normalizarLinhaPlanilha,
} from './saldoParser.js'

function item(str, x, y, width = Math.max(str.length * 5, 1)) {
  return { str, width, transform: [1, 0, 0, 1, x, y] }
}

test('converte números brasileiros e valores negativos', () => {
  assert.equal(converterNumero('1.234,56'), 1234.56)
  assert.equal(converterNumero('R$ 98,70'), 98.7)
  assert.equal(converterNumero('(12,5)'), -12.5)
  assert.equal(converterNumero(''), null)
})

test('normaliza cabeçalhos e números de planilha', () => {
  assert.deepEqual(
    normalizarLinhaPlanilha({
      'Cód. Produto': '0012',
      'Grade X': 'AZUL',
      Produto: 'Liquidificador',
      Saldo: '1.250,5',
      'Custo Médio': '89,90',
    }),
    {
      codigo: '0012',
      cor: 'AZUL',
      descricao: 'Liquidificador',
      saldo: 1250.5,
      custoMedio: 89.9,
    },
  )
})

test('prioriza o cabeçalho Produto exato e aceita aspas nas grades', () => {
  const pagina = [
    item('15581.2 - Saldo Produto Filial', 20, 720, 150),
    item('Cod Filial', 20, 700, 50),
    item('Cod Produto', 80, 700, 65),
    item("Grade 'X'", 160, 700, 50),
    item("Grade 'Y'", 220, 700, 50),
    item('Produto', 290, 700, 45),
    item('Saldo', 500, 700, 30),
    item('Custo Médio', 550, 700, 65),
    item('Total Csto Méd', 630, 700, 80),
    item('281', 35, 680, 18),
    item('1191', 95, 680, 24),
    item('3', 175, 680, 6),
    item('1', 235, 680, 6),
    item('FERRO DE PASSAR A SECO', 290, 680, 150),
    item('179', 505, 680, 18),
    item('66,99', 560, 680, 30),
    item('11991,21', 650, 680, 45),
  ]

  assert.deepEqual(extrairLinhasPosicionadas([pagina]), [{
    filial: '281',
    codigo: '1191',
    cor: '3',
    voltagem: '1',
    descricao: 'FERRO DE PASSAR A SECO',
    saldo: 179,
    custoMedio: 66.99,
  }])
})

test('extrai tabela posicionada de um PDF textual', () => {
  const pagina = [
    item('Filial', 20, 700, 30),
    item('Código', 80, 700, 40),
    item('Grade X', 140, 700, 45),
    item('Produto', 220, 700, 45),
    item('Saldo', 400, 700, 30),
    item('Custo Médio', 460, 700, 70),
    item('01', 20, 680, 12),
    item('000123', 80, 680, 36),
    item('PRETO', 140, 680, 30),
    item('Liquidificador 900W', 220, 680, 105),
    item('15,00', 400, 680, 28),
    item('R$ 89,90', 460, 680, 48),
    item('01', 20, 660, 12),
    item('000124', 80, 660, 36),
    item('BRANCO', 140, 660, 36),
    item('Ventilador 40cm', 220, 660, 85),
    item('-2,00', 400, 660, 28),
    item('R$ 120,50', 460, 660, 54),
  ]

  assert.deepEqual(extrairLinhasPosicionadas([pagina]), [
    {
      filial: '01',
      codigo: '000123',
      cor: 'PRETO',
      descricao: 'Liquidificador 900W',
      saldo: 15,
      custoMedio: 89.9,
    },
    {
      filial: '01',
      codigo: '000124',
      cor: 'BRANCO',
      descricao: 'Ventilador 40cm',
      saldo: -2,
      custoMedio: 120.5,
    },
  ])
})

test('recupera saldo unido ao fim da descrição usando custo e total', () => {
  const pagina = [
    item('Cod Filial', 20, 700, 50),
    item('Cod Produto', 80, 700, 65),
    item('Produto', 220, 700, 45),
    item('Saldo', 430, 700, 30),
    item('Custo Médio', 490, 700, 65),
    item('Total Csto Méd', 570, 700, 80),
    item('281', 35, 680, 18),
    item('66208', 95, 680, 30),
    item('SANDUICHEIRA MONDIAL PRATIC SN-011499', 220, 680, 220),
    item('52,51', 500, 680, 30),
    item('78712,49', 585, 680, 50),
  ]

  assert.deepEqual(extrairLinhasPosicionadas([pagina]), [{
    filial: '281',
    codigo: '66208',
    descricao: 'SANDUICHEIRA MONDIAL PRATIC SN-01',
    saldo: 1499,
    custoMedio: 52.51,
  }])
})

test('explica quando o PDF é uma imagem sem texto', () => {
  assert.throws(
    () => extrairLinhasPosicionadas([[]]),
    /escaneado.*texto selecionável/i,
  )
})
