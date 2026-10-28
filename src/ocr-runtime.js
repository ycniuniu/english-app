import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortWasmGlueUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { installOcrAssetCache, prefetchOcrAssets } from './ocr-cache.js'
import { OCR_MODELS, absoluteAssetUrl, formatMegabytes } from './ocr-models.js'
import { linesFromOcrItems } from './ocr-text.js'

let enginePromise = null

function pageOrigin() {
  return globalThis.location?.href || 'http://localhost/'
}

function pageBase() {
  return import.meta.env?.BASE_URL || '/'
}

function modelUrls() {
  const origin = pageOrigin()
  const base = pageBase()
  return [
    absoluteAssetUrl(OCR_MODELS.detection.file, origin, base),
    absoluteAssetUrl(OCR_MODELS.recognition.file, origin, base),
  ]
}

function wasmPaths() {
  const origin = pageOrigin()
  return {
    wasm: new URL(ortWasmUrl, origin).href,
    mjs: new URL(ortWasmGlueUrl, origin).href,
  }
}

function loadEngine(fetchImpl, urls) {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
      return PaddleOCR.create({
        textDetectionModelName: OCR_MODELS.detection.name,
        textRecognitionModelName: OCR_MODELS.recognition.name,
        textDetectionModelAsset: { url: urls[0] },
        textRecognitionModelAsset: { url: urls[1] },
        fetch: fetchImpl,
        ortOptions: {
          // One thread. Multi-thread wasm needs cross-origin isolation headers,
          // and this site does not change its hosting config.
          backend: 'wasm',
          numThreads: 1,
          simd: true,
          proxy: false,
          wasmPaths: wasmPaths(),
        },
      })
    })().catch((error) => {
      enginePromise = null
      throw error
    })
  }
  return enginePromise
}

export async function recognizePhoto(file, { signal, onProgress } = {}) {
  if (signal?.aborted) {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  }
  if (globalThis.location?.protocol === 'file:') {
    throw new Error('PaddleOCR.js requires an HTTP(S) origin so model assets can be fetched.')
  }

  const urls = modelUrls()
  const fetchImpl = installOcrAssetCache()
  await prefetchOcrAssets(urls, {
    fetchImpl,
    signal,
    expectedBytes: [OCR_MODELS.detection.bytes, OCR_MODELS.recognition.bytes],
    onProgress(progress) {
      onProgress?.({
        phase: 'download',
        ...progress,
        label: `${formatMegabytes(progress.loaded)} / ${formatMegabytes(progress.total)}`,
      })
    },
  })
  if (signal?.aborted) {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  }
  onProgress?.({ phase: 'recognize' })
  const engine = await loadEngine(fetchImpl, urls)
  const results = await engine.predict(file)
  const first = Array.isArray(results) ? results[0] : results
  return linesFromOcrItems(first?.items || [])
}
