import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'

export default function Sessoes() {
  const navigate = useNavigate()
  const sessoes = useLiveQuery(() => db.sessoes.orderBy('criadaEm').reverse().toArray(), [])
  const [filial, setFilial] = useState('')
  const [periodo, setPeriodo] = useState('')

  async function criarSessao(e) {
    e.preventDefault()
    if (!filial || !periodo) return
    const produtos = await db.produtos.where('filial').equals(filial).toArray()
    const sessaoId = await db.sessoes.add({
      filial, periodo, status: 'aberta', criadaEm: new Date().toISOString(),
    })
    // Gera uma linha de item pronta para preenchimento por produto ativo da filial
    await db.itens.bulkAdd(produtos.map(p => ({
      sessaoId, produtoId: p.id, chave: p.chave,
      transferencia: 0, licitacao: 0, clientes: 0, contagem: 0, auditoria: 0,
      assistencia: 0, avaria: 0, entradaNf: 0, falta: 0,
      diferenca: -p.saldo, observacao: '', categoriaDivergencia: '',
      statusDivergencia: 'pendente',
    })))
    navigate(`/sessoes/${sessaoId}`)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Sessões de contagem</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Cada sessão reúne a contagem de uma filial num período. Importe o saldo
          antes de abrir a sessão para que os produtos já venham carregados.
        </p>
      </div>

      <form onSubmit={criarSessao} className="flex gap-3 items-end bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex-1">
          <label className="text-xs text-slate-400">Filial</label>
          <input value={filial} onChange={e => setFilial(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            placeholder="Ex: 281" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-400">Período</label>
          <input value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            placeholder="Ex: 08/2026" />
        </div>
        <button type="submit" className="bg-sky-700 hover:bg-sky-600 text-white rounded-lg px-4 py-2 font-medium">
          Abrir sessão
        </button>
      </form>

      <div className="space-y-2">
        {sessoes?.length === 0 && (
          <p className="text-slate-500 text-sm">Nenhuma sessão criada ainda.</p>
        )}
        {sessoes?.map(s => (
          <Link key={s.id} to={`/sessoes/${s.id}`}
            className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-sky-700 rounded-lg px-4 py-3 transition-colors">
            <div>
              <div className="text-slate-100 font-medium">Filial {s.filial} — {s.periodo}</div>
              <div className="text-slate-500 text-xs">Criada em {new Date(s.criadaEm).toLocaleString('pt-BR')}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'aberta' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
              {s.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
