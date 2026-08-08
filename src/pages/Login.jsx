import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await login(email, senha)
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
          <h1 className="text-xl font-semibold text-slate-100">Entrar</h1>
          <p className="text-slate-400 text-sm mt-1">Acesse a conta da sua empresa.</p>
        </div>
        <div>
          <label className="text-xs text-slate-400">E-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Senha</label>
          <input type="password" required value={senha} onChange={e => setSenha(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
        </div>
        {erro && <p className="text-rose-400 text-sm">{erro}</p>}
        <button type="submit" disabled={carregando}
          className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium">
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-slate-500 text-sm text-center">
          Não tem conta? <Link to="/registro" className="text-sky-400 hover:underline">Criar empresa</Link>
        </p>
      </form>
    </div>
  )
}
