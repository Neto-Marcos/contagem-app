import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useOnline } from './lib/useOnline'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Importar from './pages/Importar'
import Sessoes from './pages/Sessoes'
import SessaoDetalhe from './pages/SessaoDetalhe'

function Shell({ children }) {
  const online = useOnline()
  const { empresa, usuario, logout } = useAuth()

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:flex-nowrap sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <span className="hidden font-semibold text-slate-100 md:inline">Contagem de Estoque</span>
            <span className="font-semibold text-slate-100 md:hidden">Contagem</span>
            <nav className="flex gap-1">
              <NavLink to="/importar" className={linkClass}>Importar saldo</NavLink>
              <NavLink to="/sessoes" className={linkClass}>Sessões</NavLink>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs sm:gap-3">
            <span className="hidden text-slate-500 lg:inline">{empresa?.nome}</span>
            <span className="hidden text-slate-500 lg:inline">{usuario?.nome}</span>
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${online ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {online ? 'Online' : 'Offline'}
            </span>
            <button onClick={logout} className="px-1 py-1 text-slate-400 hover:text-slate-200">Sair</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function RotaProtegida({ children }) {
  const { autenticado } = useAuth()
  if (!autenticado) return <Navigate to="/login" replace />
  return <Shell>{children}</Shell>
}

function Rotas() {
  const { autenticado } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={autenticado ? <Navigate to="/sessoes" replace /> : <Login />} />
      <Route path="/registro" element={autenticado ? <Navigate to="/sessoes" replace /> : <Registro />} />
      <Route path="/" element={<RotaProtegida><Sessoes /></RotaProtegida>} />
      <Route path="/importar" element={<RotaProtegida><Importar /></RotaProtegida>} />
      <Route path="/sessoes" element={<RotaProtegida><Sessoes /></RotaProtegida>} />
      <Route path="/sessoes/:id" element={<RotaProtegida><SessaoDetalhe /></RotaProtegida>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </BrowserRouter>
  )
}
