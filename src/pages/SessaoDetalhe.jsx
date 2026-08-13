import { memo, useCallback, useDeferredValue, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  CAMPOS_MOVIMENTO,
  CATEGORIAS_DIVERGENCIA,
  calcularDiferenca,
  calcularTotal,
} from '../lib/db'
import { exportarExcel, exportarPDF } from '../lib/exportSessao'

const formatarNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

function ProdutoIdentificacao({ item }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-100">{item.codigo}</span>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          Grade {item.cor || '0'} / {item.voltagem || '0'}
        </span>
      </div>
      <p className="mt-1 text-sm leading-snug text-slate-300">{item.descricao || 'Produto sem descrição'}</p>
    </div>
  )
}

function ResumoValores({ total, saldo, diferenca }) {
  const divergente = diferenca !== 0
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <div className="px-3 py-2 text-center">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Contado</span>
        <strong className="text-sm text-slate-100">{formatarNumero.format(total)}</strong>
      </div>
      <div className="border-x border-slate-800 px-3 py-2 text-center">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Saldo</span>
        <strong className="text-sm text-slate-100">{formatarNumero.format(saldo)}</strong>
      </div>
      <div className="px-3 py-2 text-center">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Diferença</span>
        <strong className={`text-sm ${divergente ? 'text-rose-400' : 'text-emerald-400'}`}>
          {diferenca > 0 ? '+' : ''}{formatarNumero.format(diferenca)}
        </strong>
      </div>
    </div>
  )
}

const ItemEditor = memo(function ItemEditor({ item, sessaoId, onAtualizado, modo = 'card' }) {
  const [local, setLocal] = useState(item)
  const [salvandoCampo, setSalvandoCampo] = useState(null)
  const [erro, setErro] = useState(null)
  const [expandido, setExpandido] = useState(false)
  const total = calcularTotal(local)
  const saldo = Number(local.saldo) || 0
  const diferenca = calcularDiferenca(local, saldo)
  const divergente = diferenca !== 0

  useEffect(() => { setLocal(item) }, [item])

  function alterarLocal(campo, valor) {
    setLocal(atual => ({ ...atual, [campo]: valor }))
  }

  async function salvar(campo, valor, campoApi = campo) {
    if (valor === item[campo] || (Number(valor) === Number(item[campo]) && valor !== '')) return
    setErro(null)
    setSalvandoCampo(campo)
    try {
      const atualizado = await api.atualizarItem(sessaoId, item.id, { [campoApi]: valor })
      setLocal(atualizado)
      onAtualizado(atualizado)
    } catch (err) {
      setLocal(item)
      setErro(err.message || 'Não foi possível salvar.')
    } finally {
      setSalvandoCampo(null)
    }
  }

  const movimentoInputs = CAMPOS_MOVIMENTO.map(campo => (
    <label key={campo.key} className="block min-w-0">
      <span className="mb-1 block truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {campo.label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={local[campo.key] ?? 0}
        onChange={event => alterarLocal(campo.key, event.target.value)}
        onBlur={event => salvar(campo.key, Number(event.target.value) || 0)}
        onFocus={event => event.target.select()}
        aria-label={`${campo.label} do produto ${local.codigo}`}
        className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-center text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60"
        disabled={salvandoCampo === campo.key}
      />
    </label>
  ))

  if (modo === 'table') {
    return (
      <tr className={`transition-colors hover:bg-slate-900/80 ${divergente ? 'bg-rose-950/20' : ''}`}>
        <td className="sticky left-0 z-[1] min-w-[300px] border-r border-slate-800 bg-slate-950 px-4 py-3 align-top">
          <ProdutoIdentificacao item={local} />
          {erro ? <p className="mt-2 text-xs text-rose-400">{erro}</p> : null}
        </td>
        {CAMPOS_MOVIMENTO.map(campo => (
          <td key={campo.key} className="w-20 px-1.5 py-3 align-top">
            <input
              type="number"
              inputMode="decimal"
              value={local[campo.key] ?? 0}
              onChange={event => alterarLocal(campo.key, event.target.value)}
              onBlur={event => salvar(campo.key, Number(event.target.value) || 0)}
              onFocus={event => event.target.select()}
              aria-label={`${campo.label} do produto ${local.codigo}`}
              className="h-10 w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 text-center text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </td>
        ))}
        <td className="px-3 py-4 text-center font-semibold text-slate-100">{formatarNumero.format(total)}</td>
        <td className="px-3 py-4 text-center text-slate-300">{formatarNumero.format(saldo)}</td>
        <td className={`px-3 py-4 text-center font-bold ${divergente ? 'text-rose-400' : 'text-emerald-400'}`}>
          {diferenca > 0 ? '+' : ''}{formatarNumero.format(diferenca)}
        </td>
        <td className="min-w-44 px-2 py-3 align-top">
          <select
            value={local.categoria_divergencia || ''}
            onChange={event => {
              alterarLocal('categoria_divergencia', event.target.value)
              salvar('categoria_divergencia', event.target.value, 'categoriaDivergencia')
            }}
            aria-label={`Categoria da divergência do produto ${local.codigo}`}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="">Sem categoria</option>
            {CATEGORIAS_DIVERGENCIA.map(categoria => <option key={categoria}>{categoria}</option>)}
          </select>
        </td>
        <td className="min-w-52 px-2 py-3 align-top">
          <input
            value={local.observacao || ''}
            onChange={event => alterarLocal('observacao', event.target.value)}
            onBlur={event => salvar('observacao', event.target.value)}
            aria-label={`Observação do produto ${local.codigo}`}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-slate-200 outline-none focus:border-sky-500"
            placeholder="Adicionar observação"
          />
        </td>
      </tr>
    )
  }

  return (
    <article className={`overflow-hidden rounded-xl border bg-slate-900 ${divergente ? 'border-rose-900/80' : 'border-slate-800'}`}>
      <div className="p-4">
        <ProdutoIdentificacao item={local} />
        <div className="mt-4"><ResumoValores total={total} saldo={saldo} diferenca={diferenca} /></div>
        <button
          type="button"
          onClick={() => setExpandido(valor => !valor)}
          aria-expanded={expandido}
          className="mt-3 h-11 w-full rounded-lg border border-sky-800 bg-sky-950/40 text-sm font-semibold text-sky-300 transition hover:bg-sky-900/60"
        >
          {expandido ? 'Recolher lançamentos' : total ? 'Editar lançamentos' : 'Iniciar contagem'}
        </button>
        {expandido ? (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-3 gap-2">{movimentoInputs}</div>
            {divergente ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-400">Motivo da divergência</span>
                  <select
                    value={local.categoria_divergencia || ''}
                    onChange={event => {
                      alterarLocal('categoria_divergencia', event.target.value)
                      salvar('categoria_divergencia', event.target.value, 'categoriaDivergencia')
                    }}
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 outline-none focus:border-sky-500"
                  >
                    <option value="">Selecione o motivo</option>
                    {CATEGORIAS_DIVERGENCIA.map(categoria => <option key={categoria}>{categoria}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-400">Observação</span>
                  <input
                    value={local.observacao || ''}
                    onChange={event => alterarLocal('observacao', event.target.value)}
                    onBlur={event => salvar('observacao', event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 outline-none focus:border-sky-500"
                    placeholder="Explique se necessário"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={`${salvandoCampo || erro ? 'mt-3 min-h-5' : ''} text-right text-xs`}>
          {salvandoCampo ? <span className="text-sky-400">Salvando…</span> : null}
          {erro ? <span className="text-rose-400">{erro}</span> : null}
        </div>
      </div>
    </article>
  )
})

export default function SessaoDetalhe() {
  const { id } = useParams()
  const [sessao, setSessao] = useState(null)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [somenteDivergentes, setSomenteDivergentes] = useState(false)
  const buscaAdiada = useDeferredValue(busca)

  const carregar = useCallback(() => {
    api.obterSessao(id).then(setSessao).catch(err => setErro(err.message))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const atualizarItemLocal = useCallback((itemAtualizado) => {
    setSessao(atual => ({
      ...atual,
      itens: atual.itens.map(item => item.id === itemAtualizado.id ? { ...item, ...itemAtualizado } : item),
    }))
  }, [])

  async function fecharSessao() {
    try {
      const atualizada = await api.fecharSessao(id)
      setSessao(atual => ({ ...atual, status: atualizada.status }))
    } catch (err) {
      setErro(err.message)
    }
  }

  if (erro && !sessao) return <div className="p-6 text-rose-400">{erro}</div>
  if (!sessao) return <div className="p-6 text-slate-400">Carregando…</div>

  const itens = sessao.itens || []
  const pendentes = itens.filter(item => Number(item.diferenca) !== 0 && !item.categoria_divergencia)
  const termo = buscaAdiada.trim().toLocaleLowerCase('pt-BR')
  const itensVisiveis = itens.filter(item => {
    const correspondeBusca = !termo || [item.codigo, item.descricao, item.cor, item.voltagem]
      .some(valor => String(valor ?? '').toLocaleLowerCase('pt-BR').includes(termo))
    const correspondeFiltro = !somenteDivergentes || Number(item.diferenca) !== 0
    return correspondeBusca && correspondeFiltro
  })

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <Link to="/sessoes" className="text-sm font-medium text-sky-400 hover:text-sky-300">← Voltar às sessões</Link>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">Filial {sessao.filial}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sessao.status === 'aberta' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                {sessao.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">Período {sessao.periodo} · {itens.length} produtos</p>
            <p className={`mt-1 text-sm ${pendentes.length ? 'text-rose-400' : 'text-emerald-400'}`}>
              {pendentes.length ? `${pendentes.length} divergências aguardando classificação` : 'Nenhuma divergência pendente'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={() => exportarExcel(sessao, `contagem_${sessao.filial}_${sessao.periodo}.xlsx`)} className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900">
              Exportar Excel
            </button>
            <button onClick={() => exportarPDF(sessao, `contagem_${sessao.filial}_${sessao.periodo}.pdf`)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700">
              Exportar PDF
            </button>
            {sessao.status === 'aberta' ? (
              <button onClick={fecharSessao} className="col-span-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600">
                Fechar sessão
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {erro ? <div className="rounded-lg border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-300">{erro}</div> : null}

      <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar produto</span>
          <span className="pointer-events-none absolute left-3 top-2.5 text-slate-500">⌕</span>
          <input
            type="search"
            value={busca}
            onChange={event => setBusca(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Buscar por código, descrição ou grade"
          />
        </label>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-300">
          <input type="checkbox" checked={somenteDivergentes} onChange={event => setSomenteDivergentes(event.target.checked)} className="size-4 accent-sky-600" />
          Somente divergências
        </label>
        <span className="text-center text-xs text-slate-500 sm:min-w-24">{itensVisiveis.length} exibidos</span>
      </section>

      <div className="space-y-3 lg:hidden">
        {itensVisiveis.map(item => <ItemEditor key={item.id} item={item} sessaoId={sessao.id} onAtualizado={atualizarItemLocal} />)}
      </div>

      <div className="hidden overflow-auto rounded-xl border border-slate-800 lg:block">
        <table className="min-w-[1580px] border-collapse">
          <thead className="sticky top-0 z-[2] bg-slate-900 shadow-sm shadow-black/30">
            <tr className="border-b border-slate-800">
              <th className="sticky left-0 z-[3] min-w-[300px] border-r border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Produto</th>
              {CAMPOS_MOVIMENTO.map(campo => <th key={campo.key} className="px-1.5 py-3 text-xs font-semibold text-slate-400">{campo.label}</th>)}
              <th className="px-3 py-3 text-xs font-semibold text-slate-400">Contado</th>
              <th className="px-3 py-3 text-xs font-semibold text-slate-400">Saldo</th>
              <th className="px-3 py-3 text-xs font-semibold text-slate-400">Diferença</th>
              <th className="px-2 py-3 text-xs font-semibold text-slate-400">Categoria</th>
              <th className="px-2 py-3 text-xs font-semibold text-slate-400">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {itensVisiveis.map(item => <ItemEditor key={item.id} item={item} sessaoId={sessao.id} onAtualizado={atualizarItemLocal} modo="table" />)}
          </tbody>
        </table>
      </div>

      {itensVisiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Nenhum produto encontrado.</div>
      ) : null}
    </div>
  )
}
