# Contagem de Estoque — MVP

Sistema de contagem de estoque local-first: funciona 100% offline, é instalável
como aplicativo (PWA) tanto no celular quanto no computador, e substitui a
planilha de contagem por telas com cálculo automático de diferença.

## O que já está pronto (v1 / MVP)

- Importação de saldo via PDF textual, Excel ou CSV (produto, cor, voltagem, saldo, custo médio)
- Cadastro automático de produtos a partir da importação
- Abertura de sessões de contagem por filial e período
- Lançamento de todos os movimentos (Transferência, Licitação, Clientes,
  Contagem, Auditoria, Assistência, Avaria, Entrada NF, Falta)
- Cálculo automático do total e da diferença contra o saldo — sem fórmula manual
- Categoria fixa de divergência + campo de observação livre
- Bloqueio de fechamento de sessão enquanto houver divergência sem categoria
- Exportação em Excel (.xlsx) e PDF
- Funciona 100% offline (banco de dados local no navegador via IndexedDB)
- Instalável como app no celular e no PC (PWA)

## Rodando localmente

```bash
npm install
npm run dev       # ambiente de desenvolvimento, http://localhost:5173
npm run build     # gera a versão de produção em dist/
npm run preview   # serve a versão de produção para testar
```

## Instalando como app

Com o projeto rodando (dev ou build+preview), abra no Chrome/Edge — vai
aparecer um ícone de instalação na barra de endereço (ou "Instalar app" no
menu). Isso funciona tanto no celular (Android) quanto no computador. Depois
de instalado, o app abre e funciona mesmo sem internet.

## Publicando no Railway

1. Crie um novo projeto no Railway e conecte este repositório do GitHub
   (ou faça deploy direto pela CLI: `railway up`).
2. Build command: `npm run build`
3. Start command: sirva a pasta `dist/` como estático — por exemplo com
   `npx serve dist -l $PORT`, ou configure o Railway para "Static Site"
   apontando para `dist`.
4. Depois de publicado, o link do Railway já é instalável como PWA também
   (o app funciona offline independente de onde foi baixado — a hospedagem
   só é necessária para o primeiro acesso e para sincronização futura, v2).

## Próximos passos (v2, conforme o plano)

- Sincronização entre dispositivos com resolução de conflito
- Leitura de código de barras pela câmera
- Dashboard com histórico comparativo entre períodos e valor de perda em R$
- Permissões por usuário/filial e log de auditoria
