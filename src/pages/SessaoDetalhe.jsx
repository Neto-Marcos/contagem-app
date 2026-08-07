import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, CAMPOS_MOVIMENTO, CATEGORIAS_DIVERGENCIA, calcularTotal, calcularDiferenca } from '../lib/db'
import { exportarExcel, exportarPDF } from '../lib/exportSessao'

function ItemRow({ item, produto }) {
  const [local, setLocal] = useState(item)
  const total = calcularTotal(local)
  const diferenca = calcularDiferenca(local, produto?.saldo)
  const divergente = diferenca !== 0

  async function salvar(campo, valor) {
    const novo = { ...local, [campo]: valor }
    const novoTotal = calcularTotal(novo)
    const novaDiferenca = novoTotal - (produto?.saldo || 0)
    novo.diferenca = novaDiferenca
    if (novaDiferenca === 0) {
      novo.statusDivergencia = 'ok'
    } else if (novo.statusDivergencia === 'ok') {
      novo.statusDivergencia = 'pendente'
    }
    setLocal(novo)
    await db.itens.update(item.id, novo)
  }

  return (
    <tr className={divergente ? 'bg-rose-950/40' : ''}>
      <td className="px-3 py-2 text-slate-300 whitespace-nowrap text-sm">
        {produto?.codigo} <span className="text-slate-500">· {produto?.cor}/{produto?.voltagem}</span>
        <div className="text-slate-400 text-xs truncate max-w-[220px]">{produto?.descricao}</div>
      </td>
      {CAMPOS_MOVIMENTO.map(c => (
        <td key={c.key} className="px-1 py-2">
          <input type="number" value={local[c.key] ?? 0}
            onChange={e => salvar(c.key, Number(e.target.value))}
            className="w-16 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-100 text-sm" />
        </td>
      ))}
      <td className="px-3 py-2 text-center text-slate-200 font-medium">{total}</td>
      <td className="px-3 py-2 text-center text-slate-400">{produto?.saldo ?? 0}</td>
      <td className={`px-3 py-2 text-center font-semibold ${divergente ? 'text-rose-400' : 'text-emerald-400'}`}>
        {diferenca}
      </td>
      <td className="px-2 py-2">
        <select value={local.categoriaDivergencia || ''}
          onChange={e => salvar('categoriaDivergencia', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-slate-200">
          <option value="">—</option>
          {CATEGORIAS_DIVERGENCIA.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        <input value={local.observacao || ''} onChange={e => salvar('observacao', e.target.value)}
          className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          placeholder="Observação" />
      </td>
    </tr>
  )
}

export default function SessaoDetalhe() {
  const { id } = useParams()
  const sessaoId = Number(id)
  const sessao = useLiveQuery(() => db.sessoes.get(sessaoId), [sessaoId])
  const itens = useLiveQuery(() => db.itens.where('sessaoId').equals(sessaoId).toArray(), [sessaoId])
  const produtos = useLiveQuery(() => db.produtos.toArray(), [])
  const produtoPorId = useMemo(() => Object.fromEntries((produtos || []).map(p => [p.id, p])), [produtos])

  const pendentes = (itens || []).filter(i => i.diferenca !== 0 && !i.categoriaDivergencia)

  async function fecharSessao() {
    if (pendentes.length > 0) {
      alert(`Ainda há ${pendentes.length} item(ns) com divergência sem categoria. Classifique antes de fechar.`)
      return
    }
    await db.sessoes.update(sessaoId, { status: 'fechada' })
  }

  if (!sessao || !itens) return <div className="p-6 text-slate-400">Carregando…</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/sessoes" className="text-sky-400 text-sm hover:underline">← Sessões</Link>
          <h1 className="text-xl font-semibold text-slate-100 mt-1">
            Filial {sessao.filial} — {sessao.periodo}
          </h1>
          <p className="text-slate-500 text-sm">
            {itens.length} itens · {pendentes.length} divergências pendentes de categoria
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportarExcel(sessaoId, `contagem_${sessao.filial}_${sessao.periodo}.xlsx`)}
            className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-sm">
            Exportar Excel
          </button>
          <button onClick={() => exportarPDF(sessaoId, `contagem_${sessao.filial}_${sessao.periodo}.pdf`)}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-2 text-sm">
            Exportar PDF
          </button>
          {sessao.status === 'aberta' && (
            <button onClick={fecharSessao} className="bg-sky-700 hover:bg-sky-600 text-white rounded-lg px-3 py-2 text-sm">
              Fechar sessão
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-slate-400">Produto</th>
              {CAMPOS_MOVIMENTO.map(c => (
                <th key={c.key} className="px-1 py-2 text-xs text-slate-400">{c.label}</th>
              ))}
              <th className="px-3 py-2 text-xs text-slate-400">C. Total</th>
              <th className="px-3 py-2 text-xs text-slate-400">Saldo</th>
              <th className="px-3 py-2 text-xs text-slate-400">Diferença</th>
              <th className="px-2 py-2 text-xs text-slate-400">Categoria</th>
              <th className="px-2 py-2 text-xs text-slate-400">OBS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {itens.map(item => (
              <ItemRow key={item.id} item={item} produto={produtoPorId[item.produtoId]} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
