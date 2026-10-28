import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { capOrtWasmGlue, ORT_WASM_MEMORY_MARKER } from './src/ort-wasm-cap.js'

function assetText(source) {
  if (typeof source === 'string') return source
  if (source instanceof Uint8Array) return Buffer.from(source).toString('utf8')
  return ''
}

// The ?url import copies the stock glue through as a static asset, so the
// cap has to land on the emitted file. A load() hook would turn ?url into
// a module and break wasmPaths.
function capOrtWasmMemory() {
  return {
    name: 'cap-ort-wasm-memory',
    generateBundle(_options, bundle) {
      let patched = 0
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !String(item.fileName || '').endsWith('.mjs')) continue
        const source = assetText(item.source)
        if (!source.includes(ORT_WASM_MEMORY_MARKER) && !source.includes('ortWasmThreaded')) continue
        item.source = capOrtWasmGlue(source)
        patched += 1
      }
      if (!patched) {
        throw new Error('onnxruntime threaded wasm glue was not in the build, so the Safari memory cap was not applied')
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), capOrtWasmMemory()],
  resolve: {
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
})
