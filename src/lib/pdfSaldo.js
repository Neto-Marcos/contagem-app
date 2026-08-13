import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extrairLinhasPosicionadas } from './saldoParser'

GlobalWorkerOptions.workerSrc = workerUrl

export async function extrairLinhasDoPdf(file) {
  const tarefa = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const documento = await tarefa.promise
  const paginas = []

  try {
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero)
      const conteudo = await pagina.getTextContent()
      paginas.push(conteudo.items)
      pagina.cleanup()
    }
  } finally {
    await tarefa.destroy()
  }

  return extrairLinhasPosicionadas(paginas)
}
