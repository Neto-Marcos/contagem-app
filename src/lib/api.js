const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, { method = 'GET', body, semAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (!semAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('empresa')
      window.location.href = '/login'
    }
    throw new Error(data.erro || 'Falha na requisição.')
  }
  return data
}

export const api = {
  registro: (dados) => request('/api/auth/registro', { method: 'POST', body: dados, semAuth: true }),
  login: (dados) => request('/api/auth/login', { method: 'POST', body: dados, semAuth: true }),

  listarProdutos: (filial) => request(`/api/produtos${filial ? `?filial=${encodeURIComponent(filial)}` : ''}`),
  importarProdutos: (linhas) => request('/api/produtos/import', { method: 'POST', body: { linhas } }),

  listarSessoes: () => request('/api/sessoes'),
  criarSessao: (dados) => request('/api/sessoes', { method: 'POST', body: dados }),
  obterSessao: (id) => request(`/api/sessoes/${id}`),
  fecharSessao: (id) => request(`/api/sessoes/${id}`, { method: 'PATCH', body: { status: 'fechada' } }),
  atualizarItem: (sessaoId, itemId, patch) =>
    request(`/api/sessoes/${sessaoId}/itens/${itemId}`, { method: 'PATCH', body: patch }),
}
