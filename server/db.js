import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

export async function migrate() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS empresas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'operador', 'visualizador')),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      chave TEXT NOT NULL,
      codigo TEXT NOT NULL,
      cor TEXT NOT NULL DEFAULT '0',
      voltagem TEXT NOT NULL DEFAULT '0',
      descricao TEXT NOT NULL DEFAULT '',
      filial TEXT NOT NULL DEFAULT '',
      saldo NUMERIC NOT NULL DEFAULT 0,
      custo_medio NUMERIC NOT NULL DEFAULT 0,
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (empresa_id, chave)
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      filial TEXT NOT NULL,
      periodo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada')),
      criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS itens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sessao_id UUID NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
      produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      chave TEXT NOT NULL,
      transferencia NUMERIC NOT NULL DEFAULT 0,
      licitacao NUMERIC NOT NULL DEFAULT 0,
      clientes NUMERIC NOT NULL DEFAULT 0,
      contagem NUMERIC NOT NULL DEFAULT 0,
      auditoria NUMERIC NOT NULL DEFAULT 0,
      assistencia NUMERIC NOT NULL DEFAULT 0,
      avaria NUMERIC NOT NULL DEFAULT 0,
      entrada_nf NUMERIC NOT NULL DEFAULT 0,
      falta NUMERIC NOT NULL DEFAULT 0,
      diferenca NUMERIC NOT NULL DEFAULT 0,
      categoria_divergencia TEXT NOT NULL DEFAULT '',
      status_divergencia TEXT NOT NULL DEFAULT 'pendente',
      observacao TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_empresa_filial ON produtos(empresa_id, filial);
    CREATE INDEX IF NOT EXISTS idx_sessoes_empresa ON sessoes(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_itens_sessao ON itens(sessao_id);
  `)
}
