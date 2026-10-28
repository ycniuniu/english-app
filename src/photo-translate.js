import { photoTranslationDirection } from './ocr-text.js'
import { translateText } from './translate.js'

const EMPTY = '没有认出文字，请换一张更清晰的照片。'
const OFFLINE = '翻译没有连上，请检查网络后再试。'

export async function translatePhotoLines(lines, options = {}) {
  const translateImpl = options.translateImpl || translateText
  const list = (Array.isArray(lines) ? lines : []).map((line) => String(line ?? '').trim()).filter(Boolean)
  if (!list.length) return { ok: false, error: EMPTY, rows: [] }

  const rows = []
  for (const source of list) {
    if (options.signal?.aborted) {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    }
    const direction = photoTranslationDirection(source)
    let result
    try {
      result = await translateImpl(source, {
        signal: options.signal,
        direction,
        fetchImpl: options.fetchImpl,
        maxBytes: options.maxBytes,
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      rows.push({ source, zh: '', script: direction.script })
      return { ok: false, error: OFFLINE, rows }
    }
    if (!result?.ok) {
      rows.push({ source, zh: '', script: direction.script })
      return { ok: false, error: result?.error || OFFLINE, rows }
    }
    rows.push({ source, zh: result.text, script: direction.script })
  }
  return { ok: true, rows }
}
