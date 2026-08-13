const HEADER_ALIASES = {
  filial: ['filial', 'cod filial', 'loja'],
  codigo: ['codigo', 'cod produto', 'cod. produto', 'referencia', 'sku'],
  cor: ['cor', 'grade x'],
  voltagem: ['voltagem', 'grade y'],
  descricao: ['produto', 'descricao', 'mercadoria'],
  saldo: ['saldo atual', 'saldo estoque', 'saldo', 'estoque', 'quantidade', 'qtde'],
  custoMedio: ['custo medio', 'custo médio', 'custo'],
  totalCustoMedio: ['total csto med', 'total custo medio'],
}

export function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const HEADER_MAP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).flatMap(([campo, aliases]) =>
    aliases.map((alias) => [normalizarTexto(alias), campo]),
  ),
)

export function converterNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null

  let texto = String(valor ?? '').replace(/\s|R\$/gi, '').trim()
  if (!texto) return null

  const negativoPorParenteses = texto.startsWith('(') && texto.endsWith(')')
  texto = texto.replace(/[()]/g, '').replace(/[^\d,.-]/g, '')

  const ultimaVirgula = texto.lastIndexOf(',')
  const ultimoPonto = texto.lastIndexOf('.')
  if (ultimaVirgula > ultimoPonto) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (ultimoPonto > ultimaVirgula && ultimaVirgula >= 0) {
    texto = texto.replace(/,/g, '')
  } else if (ultimaVirgula >= 0) {
    texto = texto.replace(',', '.')
  }

  const numero = Number(texto)
  if (!Number.isFinite(numero)) return null
  return negativoPorParenteses ? -numero : numero
}

export function normalizarLinhaPlanilha(row) {
  const linha = {}
  for (const [chave, valor] of Object.entries(row)) {
    const campo = HEADER_MAP[normalizarTexto(chave)]
    if (campo) linha[campo] = valor
  }

  if ('saldo' in linha) linha.saldo = converterNumero(linha.saldo) ?? 0
  if ('custoMedio' in linha) linha.custoMedio = converterNumero(linha.custoMedio) ?? 0
  return linha
}

function agruparPorLinha(itens) {
  const linhas = []
  const ordenados = [...itens]
    .filter((item) => item.str?.trim())
    .map((item) => ({
      texto: item.str.trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      largura: Math.max(item.width || 0, 0),
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  for (const item of ordenados) {
    let linha = linhas.find((candidata) => Math.abs(candidata.y - item.y) <= 2.5)
    if (!linha) {
      linha = { y: item.y, itens: [] }
      linhas.push(linha)
    }
    linha.itens.push(item)
  }

  return linhas
    .sort((a, b) => b.y - a.y)
    .map((linha) => ({ ...linha, itens: linha.itens.sort((a, b) => a.x - b.x) }))
}

function localizarColunas(itens) {
  const colunas = {}

  for (const [campo, aliases] of Object.entries(HEADER_ALIASES)) {
    let melhor = null
    for (const item of itens) {
      const texto = normalizarTexto(item.texto)
      for (const aliasOriginal of aliases) {
        const alias = normalizarTexto(aliasOriginal)
        const indice = texto.indexOf(alias)
        if (indice < 0) continue

        const posicao = item.x + (item.largura * indice / Math.max(texto.length, 1))
        const candidato = {
          x: posicao,
          precisao: alias.length + (texto === alias ? 1000 : 0),
        }
        if (!melhor || candidato.precisao > melhor.precisao) melhor = candidato
      }
    }
    if (melhor) colunas[campo] = melhor.x
  }

  return colunas
}

function possuiCabecalhoMinimo(colunas) {
  return Number.isFinite(colunas.codigo) && Number.isFinite(colunas.saldo)
}

function textoNaFaixa(itens, esquerda, direita) {
  if (itens.length > 1) {
    return itens
      .filter((item) => item.x >= esquerda && item.x < direita)
      .map((item) => item.texto)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const partes = []

  for (const item of itens) {
    const inicio = item.x
    const fim = item.x + Math.max(item.largura, 0.5)
    if (fim <= esquerda || inicio >= direita) continue

    if (item.largura <= 0.5 || (inicio >= esquerda && fim <= direita)) {
      partes.push(item.texto)
      continue
    }

    const tamanho = item.texto.length
    const indiceInicial = Math.max(0, Math.floor((esquerda - inicio) / item.largura * tamanho))
    const indiceFinal = Math.min(tamanho, Math.ceil((direita - inicio) / item.largura * tamanho))
    const trecho = item.texto.slice(indiceInicial, indiceFinal).trim()
    if (trecho) partes.push(trecho)
  }

  return partes.join(' ').replace(/\s+/g, ' ').trim()
}

function lerLinha(itens, colunas) {
  const ordenadas = Object.entries(colunas).sort(([, xA], [, xB]) => xA - xB)
  const linha = {}

  ordenadas.forEach(([campo, x], indice) => {
    const xAnterior = ordenadas[indice - 1]?.[1]
    const xSeguinte = ordenadas[indice + 1]?.[1]
    const esquerda = xAnterior == null ? -Infinity : (xAnterior + x) / 2
    const direita = xSeguinte == null ? Infinity : (x + xSeguinte) / 2
    const texto = textoNaFaixa(itens, esquerda, direita)
    if (texto) linha[campo] = texto
  })

  return linha
}

function limparCodigo(valor) {
  return String(valor ?? '')
    .replace(/^(c[oó]d(?:igo)?\.?\s*)/i, '')
    .trim()
}

export function extrairLinhasPosicionadas(paginas) {
  const resultado = []
  let encontrouTexto = false
  let encontrouCabecalho = false

  for (const itensPagina of paginas) {
    if (itensPagina.some((item) => item.str?.trim())) encontrouTexto = true
    const linhas = agruparPorLinha(itensPagina)
    let colunasAtuais = null

    for (let indice = 0; indice < linhas.length; indice++) {
      const linha = linhas[indice]
      const itensComProxima = [...linha.itens, ...(linhas[indice + 1]?.itens || [])]
      const colunas = localizarColunas(itensComProxima)

      if (possuiCabecalhoMinimo(colunas)) {
        colunasAtuais = colunas
        encontrouCabecalho = true
        continue
      }
      if (!colunasAtuais) continue

      const dados = lerLinha(linha.itens, colunasAtuais)
      const codigo = limparCodigo(dados.codigo)
      let saldo = converterNumero(dados.saldo)
      const custoMedio = converterNumero(dados.custoMedio) ?? 0
      const totalCustoMedio = converterNumero(dados.totalCustoMedio)
      const contemTotalGeral = Object.values(dados)
        .some((valor) => normalizarTexto(valor).includes('total geral'))
      if (!codigo || contemTotalGeral || /^(total|subtotal)$/i.test(codigo)) continue

      if (custoMedio > 0 && totalCustoMedio != null) {
        const saldoCalculado = Math.round(totalCustoMedio / custoMedio)
        const totalRecalculado = saldoCalculado * custoMedio
        const calculoConfere = Math.abs(totalRecalculado - totalCustoMedio) <= 0.1
        if (calculoConfere && saldo !== saldoCalculado) {
          saldo = saldoCalculado
          if (dados.descricao?.endsWith(String(saldoCalculado))) {
            dados.descricao = dados.descricao.slice(0, -String(saldoCalculado).length).trim()
          }
        }
      }
      if (saldo == null) continue

      const camposImportados = { ...dados }
      delete camposImportados.totalCustoMedio

      resultado.push({
        ...camposImportados,
        codigo,
        saldo,
        custoMedio,
      })
    }
  }

  if (!encontrouTexto) {
    throw new Error('Este PDF parece ser escaneado e não contém texto selecionável. Exporte o relatório como PDF textual ou Excel.')
  }
  if (!encontrouCabecalho) {
    throw new Error('Não encontrei as colunas Código e Saldo no PDF. Verifique se o relatório mostra esses cabeçalhos.')
  }
  if (resultado.length === 0) {
    throw new Error('As colunas foram encontradas, mas nenhuma linha de produto pôde ser lida no PDF.')
  }

  return resultado
}
