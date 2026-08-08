import express from 'express'
import cors from 'cors'
import { migrate } from './db.js'
import { authRouter } from './routes/auth.js'
import { produtosRouter } from './routes/produtos.js'
import { sessoesRouter } from './routes/sessoes.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/produtos', produtosRouter)
app.use('/api/sessoes', sessoesRouter)

const port = process.env.PORT || 3001

migrate()
  .then(() => {
    app.listen(port, () => console.log(`API rodando na porta ${port}`))
  })
  .catch((err) => {
    console.error('Falha ao migrar banco de dados:', err)
    process.exit(1)
  })
