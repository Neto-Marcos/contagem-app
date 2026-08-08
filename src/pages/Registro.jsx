import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [empresaNome, setEmpresaNome] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await registrar(empresaNome, nome, email, senha)
      navigate('/sessoes')
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Criar empresa</h1>
          <p className="text-slate-400 text-sm mt-1">Cadastre sua empresa e o primeiro usuário admin.</p>
        </div>
        <div>
          <label className="text-xs text-slate-400">Nome da empresa</label>
          <input required value={empresaNome} onChange={e => setEmpresaNome(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Seu nome</label>
          <input required value={nome} onChange={e => setNome(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        <div>
          <label className="text-xs text-slate-400">E-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Senha (mín. 6 caracteres)</label>
          <input type="password" required minLength={6} value={senha} onChange={e => setSenha(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        {erro && <p className="text-rose-400 text-sm">{erro}</p>}
        <button type="submit" disabled={carregando}
          className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium">
          {carregando ? 'Criando…' : 'Criar empresa'}
        </button>
        <p className="text-slate-500 text-sm text-center">
          Já tem conta? <Link to="/login" className="text-sky-400 hover:underline">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
