import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { spawn } = require('node:child_process')

const port = process.env.PORT || '3000'
const bin = require.resolve('serve/build/main.js')

const child = spawn(process.execPath, [bin, 'dist', '-s', '-l', port], {
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
