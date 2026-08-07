import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { useOnline } from './lib/useOnline'
import Importar from './pages/Importar'
import Sessoes from './pages/Sessoes'
import SessaoDetalhe from './pages/SessaoDetalhe'

function Shell({ children }) {
  const online = useOnline()
  const totalProdutos = useLiveQuery(() => db.produtos.count(), [])

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-slate-100 font-semibold">Contagem de Estoque</span>
            <nav className="flex gap-1">
              <NavLink to="/importar" className={linkClass}>Importar saldo</NavLink>
              <NavLink to="/sessoes" className={linkClass}>Sessões</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">{totalProdutos ?? 0} produtos no dispositivo</span>
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${online ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {online ? 'Online' : 'Offline — funcionando normalmente'}
            </span>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Sessoes />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/sessoes" element={<Sessoes />} />
          <Route path="/sessoes/:id" element={<SessaoDetalhe />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
