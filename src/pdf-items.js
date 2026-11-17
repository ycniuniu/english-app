export async function pdfTextItems(data) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    } catch {
      // Node tests parse without a worker.
    }
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true, isEvalSupported: false }).promise
  const items = []
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!item || typeof item.str !== 'string' || !item.str.trim()) continue
      const transform = item.transform || [0, 0, 0, 0, 0, 0]
      items.push({ page: pageNumber, x: transform[4], y: transform[5], text: item.str })
    }
  }
  return { pageCount: doc.numPages, items }
}

export async function renderPdfPage(data, pageNumber, canvas) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true, isEvalSupported: false }).promise
  const page = await doc.getPage(Math.min(Math.max(pageNumber, 1), doc.numPages))
  const base = page.getViewport({ scale: 1 })
  const width = canvas.parentElement ? canvas.parentElement.clientWidth : 360
  const scale = Math.max(0.8, Math.min(2, (width - 8) / base.width))
  const viewport = page.getViewport({ scale })
  const context = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: context, viewport }).promise
  return { pageCount: doc.numPages, page: pageNumber }
}
