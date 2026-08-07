import { useState } from 'react'
import { importarSaldoDeArquivo } from '../lib/importSaldo'

export default function Importar() {
  const [status, setStatus] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setCarregando(true)
    setErro(null)
    setStatus(null)
    try {
      const resultado = await importarSaldoDeArquivo(file)
      setStatus(resultado)
    } catch (err) {
      setErro(err.message || 'Falha ao importar o arquivo.')
    } finally {
      setCarregando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Importar saldo</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Envie a planilha Excel/CSV exportada do sistema (ERP) com o saldo atual.
          Colunas esperadas: Filial, Código, Grade X (cor), Grade Y (voltagem),
          Produto, Saldo, Custo Médio. Se você tem só o PDF, exporte para Excel
          no próprio ERP antes — o layout de PDF varia demais para importar direto
          com segurança.
        </p>
      </div>

      <label className="block border-2 border-dashed border-slate-700 rounded-xl p-10 text-center cursor-pointer hover:border-sky-600 transition-colors">
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        <span className="text-slate-300">
          {carregando ? 'Importando…' : 'Clique para selecionar o arquivo (.xlsx, .xls, .csv)'}
        </span>
      </label>

      {status && (
        <div className="rounded-lg bg-emerald-950 border border-emerald-800 p-4 text-emerald-300 text-sm">
          Importação concluída: {status.total} linhas lidas — {status.inseridos} produtos novos,
          {' '}{status.atualizados} atualizados.
        </div>
      )}
      {erro && (
        <div className="rounded-lg bg-rose-950 border border-rose-800 p-4 text-rose-300 text-sm">
          {erro}
        </div>
      )}
    </div>
  )
}
