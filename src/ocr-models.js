// Measured from the files this app actually ships or loads.
// Detection and recognition tars live in public/ocr/.
// The wasm and OpenCV sizes are the packages loaded on the first photo.
export const OCR_CACHE_NAME = 'opening-ocr-assets-v1'

export const OCR_MODELS = Object.freeze({
  detection: Object.freeze({
    name: 'PP-OCRv5_mobile_det',
    file: 'PP-OCRv5_mobile_det_onnx_infer.tar',
    bytes: 4843520,
  }),
  recognition: Object.freeze({
    name: 'PP-OCRv5_mobile_rec',
    file: 'PP-OCRv5_mobile_rec_onnx_infer.tar',
    bytes: 16701440,
  }),
})

export const OCR_RUNTIME_BYTES = Object.freeze({
  wasm: 14848852,
  wasmGlue: 24738,
  opencv: 10378215,
})

export function ocrModelBytes() {
  return OCR_MODELS.detection.bytes + OCR_MODELS.recognition.bytes
}

export function ocrRuntimeBytes() {
  return OCR_RUNTIME_BYTES.wasm + OCR_RUNTIME_BYTES.wasmGlue + OCR_RUNTIME_BYTES.opencv
}

export function ocrFirstLoadBytes() {
  return ocrModelBytes() + ocrRuntimeBytes()
}

export function formatMegabytes(bytes) {
  return `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB`
}

// megabitsPerSecond uses decimal megabits (1 Mbps = 1_000_000 bits/s).
export function estimateFirstLoadSeconds(megabitsPerSecond) {
  const mbps = Number(megabitsPerSecond)
  if (!Number.isFinite(mbps) || mbps <= 0) return null
  const bytesPerSecond = (mbps * 1000 * 1000) / 8
  return ocrFirstLoadBytes() / bytesPerSecond
}

export function ocrAssetPath(file, base = '/') {
  const prefix = String(base || '/').endsWith('/') ? String(base || '/') : `${base}/`
  return `${prefix}ocr/${file}`
}

export function absoluteAssetUrl(file, origin, base = '/') {
  return new URL(ocrAssetPath(file, base), origin || 'http://localhost/').href
}
