// onnxruntime-web 1.24 and 1.31 ship only the threaded wasm build.
// Its glue allocates shared memory with maximum 65536 pages (4 GiB).
// iPhone Safari, including Home Screen standalone mode, rejects that
// reservation with RangeError: Out of memory even when numThreads is 1.
// 3072 pages is 192 MiB, under the shared-memory ceiling that still
// runs this mobile OCR pair. The wasm import allows any maximum up to 65536.
export const ORT_WASM_MEMORY_MARKER = 'maximum:65536,shared:!0'
export const ORT_SAFARI_WASM_PAGES = 3072

export function ortSafariWasmMaximum() {
  return `maximum:${ORT_SAFARI_WASM_PAGES},shared:!0`
}

export function capOrtWasmGlue(source) {
  const text = String(source ?? '')
  const marker = ORT_WASM_MEMORY_MARKER
  const next = ortSafariWasmMaximum()
  if (!text.includes(marker)) {
    if (text.includes(next)) return text
    throw new Error('onnxruntime wasm glue has no 4 GiB shared-memory allocation to cap')
  }
  return text.replaceAll(marker, next)
}
