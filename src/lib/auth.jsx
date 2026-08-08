import { createContext, useContext, useState, useCallback } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

function lerSessaoSalva() {
  const token = localStorage.getItem('token')
  const empresaRaw = localStorage.getItem('empresa')
  if (!token || !empresaRaw) return null
  try {
    return { token, empresa: JSON.parse(empresaRaw), usuario: decodificarUsuario(token) }
  } catch {
    return null
  }
}

function decodificarUsuario(token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  return { nome: payload.nome, email: payload.email, role: payload.role }
}

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessaoSalva)

  const salvar = useCallback((resposta) => {
    localStorage.setItem('token', resposta.token)
    localStorage.setItem('empresa', JSON.stringify(resposta.empresa))
    setSessao({ token: resposta.token, empresa: resposta.empresa, usuario: decodificarUsuario(resposta.token) })
  }, [])

  const login = useCallback(async (email, senha) => {
    const resposta = await api.login({ email, senha })
    salvar(resposta)
  }, [salvar])

  const registrar = useCallback(async (empresaNome, nome, email, senha) => {
    const resposta = await api.registro({ empresaNome, nome, email, senha })
    salvar(resposta)
  }, [salvar])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('empresa')
    setSessao(null)
  }, [])

  return (
    <AuthContext.Provider value={{ ...sessao, autenticado: !!sessao, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
