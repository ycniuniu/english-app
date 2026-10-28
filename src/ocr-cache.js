import { OCR_CACHE_NAME } from './ocr-models.js'

export function requestUrl(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input && typeof input.url === 'string') return input.url
  return ''
}

export function isOcrAssetUrl(url) {
  const value = String(url || '')
  return /\/ocr\/|\.wasm(\?|$)|ort-wasm|paddle-model-ecology|onnxruntime-web/i.test(value)
}

async function openCache(cachesImpl, cacheName) {
  if (!cachesImpl || typeof cachesImpl.open !== 'function') return null
  try {
    return await cachesImpl.open(cacheName)
  } catch {
    return null
  }
}

export async function fetchWithAssetCache(input, init, { fetchImpl = fetch, cachesImpl, cacheName = OCR_CACHE_NAME } = {}) {
  const url = requestUrl(input)
  const cache = isOcrAssetUrl(url) ? await openCache(cachesImpl, cacheName) : null
  if (cache) {
    try {
      const hit = await cache.match(url)
      if (hit) return hit
    } catch {
      // A broken cache should not block a network read.
    }
  }

  const response = await fetchImpl(input, init)
  if (cache && response?.ok && typeof response.clone === 'function') {
    try {
      const copy = response.clone()
      // Do not await. Safari can leave cache.put pending on a multi-megabyte
      // model, which would keep the status on "正在下载" and never start OCR.
      Promise.resolve()
        .then(() => cache.put(url, copy))
        .catch(() => {
          // Quota or private mode. This response is still usable.
        })
    } catch {
      // A body that cannot be cloned is still returned to the caller.
    }
  }
  return response
}

let patched = false

export function installOcrAssetCache(cachesImpl = globalThis.caches) {
  if (patched || typeof globalThis.fetch !== 'function') return globalThis.fetch.bind(globalThis)
  const original = globalThis.fetch.bind(globalThis)
  const wrapped = (input, init) => fetchWithAssetCache(input, init, { fetchImpl: original, cachesImpl, cacheName: OCR_CACHE_NAME })
  globalThis.fetch = wrapped
  patched = true
  return wrapped
}

export async function prefetchOcrAssets(urls, { fetchImpl = fetch, signal, onProgress, expectedBytes = [] } = {}) {
  let loaded = 0
  const total = expectedBytes.reduce((sum, size) => sum + Number(size || 0), 0)
  for (let index = 0; index < urls.length; index += 1) {
    if (signal?.aborted) {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    }
    const response = await fetchImpl(urls[index], { signal })
    if (!response?.ok) {
      const error = new Error(`Failed to download ${urls[index]}: HTTP ${response?.status}`)
      throw error
    }
    const buffer = await response.arrayBuffer()
    loaded += buffer.byteLength || expectedBytes[index] || 0
    onProgress?.({
      loaded,
      total: total || loaded,
      label: '',
    })
  }
  return { loaded, total: total || loaded }
}
