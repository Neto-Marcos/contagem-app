import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { CAMPOS_MOVIMENTO, CATEGORIAS_DIVERGENCIA, calcularTotal } from '../lib/db'
import { exportarExcel, exportarPDF } from '../lib/exportSessao'

function ItemRow({ item, sessaoId, onAtualizado }) {
  const [local, setLocal] = useState(item)
  const [salvando, setSalvando] = useState(false)
  const total = calcularTotal(local)
  const diferenca = local.diferenca
  const divergente = Number(diferenca) !== 0

  async function salvar(campo, valor) {
    const novo = { ...local, [campo]: valor }
    setLocal(novo)
    setSalvando(true)
    try {
      const atualizado = await api.atualizarItem(sessaoId, item.id, { [campo]: valor })
      setLocal(atualizado)
      onAtualizado(atualizado)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <tr className={divergente ? 'bg-rose-950/40' : ''}>
      <td className="px-3 py-2 text-slate-300 whitespace-nowrap text-sm">
        {local.codigo} <span className="text-slate-500">· {local.cor}/{local.voltagem}</span>
        <div className="text-slate-400 text-xs truncate max-w-[220px]">{local.descricao}</div>
      </td>
      {CAMPOS_MOVIMENTO.map(c => (
        <td key={c.key} className="px-1 py-2">
          <input type="number" value={local[c.key] ?? 0}
            onChange={e => salvar(c.key, Number(e.target.value))}
            disabled={salvando}
            className="w-16 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-100 text-sm" />
        </td>
      ))}
      <td className="px-3 py-2 text-center text-slate-200 font-medium">{total}</td>
      <td className="px-3 py-2 text-center text-slate-400">{local.saldo ?? 0}</td>
      <td className={`px-3 py-2 text-center font-semibold ${divergente ? 'text-rose-400' : 'text-emerald-400'}`}>
        {diferenca}
      </td>
      <td className="px-2 py-2">
        <select value={local.categoria_divergencia || ''}
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
  const [sessao, setSessao] = useState(null)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(() => {
    api.obterSessao(id).then(setSessao).catch(err => setErro(err.message))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  function atualizarItemLocal(itemAtualizado) {
    setSessao(s => ({
      ...s,
      itens: s.itens.map(i => i.id === itemAtualizado.id ? { ...i, ...itemAtualizado } : i),
    }))
  }

  async function fecharSessao() {
    try {
      const atualizada = await api.fecharSessao(id)
      setSessao(s => ({ ...s, status: atualizada.status }))
    } catch (err) {
      alert(err.message)
    }
  }

  if (erro) return <div className="p-6 text-rose-400">{erro}</div>
  if (!sessao) return <div className="p-6 text-slate-400">Carregando…</div>

  const itens = sessao.itens || []
  const pendentes = itens.filter(i => Number(i.diferenca) !== 0 && !i.categoria_divergencia)

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
          <button onClick={() => exportarExcel(sessao, `contagem_${sessao.filial}_${sessao.periodo}.xlsx`)}
            className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-sm">
            Exportar Excel
          </button>
          <button onClick={() => exportarPDF(sessao, `contagem_${sessao.filial}_${sessao.periodo}.pdf`)}
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
              <ItemRow key={item.id} item={item} sessaoId={sessao.id} onAtualizado={atualizarItemLocal} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
