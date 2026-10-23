import { splitSentences } from './text.js'

const ENDPOINT = 'https://api.mymemory.translated.net/get'
const DEFAULT_MAX_BYTES = 450

export function pronounceText(source, result, english) {
  return String((english ? result : source) ?? '').trim()
}

export function translationDirection(text) {
  const cjk = (String(text).match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (String(text).match(/[A-Za-z]/g) || []).length
  if (cjk > latin) {
    return { from: 'zh-CN', to: 'en', english: true, label: '中文 → 英文' }
  }
  return { from: 'en', to: 'zh-CN', english: false, label: '英文 → 中文' }
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).length
}

function breakByBytes(text, maxBytes) {
  const parts = []
  let buf = ''
  for (const ch of text) {
    if (buf && utf8Bytes(buf + ch) > maxBytes) {
      parts.push(buf)
      buf = ch
    } else {
      buf += ch
    }
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts
}

export function packForTranslation(text, maxBytes = DEFAULT_MAX_BYTES) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return []
  const sentences = splitSentences(trimmed)
  const pieces = sentences.length ? sentences : [trimmed]
  const chunks = []
  let buf = ''
  const flush = () => {
    const next = buf.trim()
    if (next) chunks.push(next)
    buf = ''
  }

  for (const sentence of pieces) {
    if (utf8Bytes(sentence) > maxBytes) {
      flush()
      chunks.push(...breakByBytes(sentence, maxBytes))
      continue
    }
    const joined = buf ? `${buf} ${sentence}` : sentence
    if (utf8Bytes(joined) <= maxBytes) buf = joined
    else {
      flush()
      buf = sentence
    }
  }
  flush()
  return chunks
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function parseMyMemory(data) {
  const raw = data?.responseData?.translatedText
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: '没有得到翻译，请稍后再试。' }
  }
  const text = decodeEntities(raw).trim()
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(text)) {
    return { ok: false, error: '今天的免费翻译额度用完了，请明天再试。' }
  }
  const status = Number(data?.responseStatus)
  if (Number.isFinite(status) && status !== 200) {
    return { ok: false, error: '翻译暂时不可用，请稍后再试。' }
  }
  return { ok: true, text }
}

export async function translateText(text, { fetchImpl = fetch, signal, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { ok: false, error: '请先输入要翻译的内容。' }

  const direction = translationDirection(trimmed)
  const chunks = packForTranslation(trimmed, maxBytes)
  const pieces = []

  for (const chunk of chunks) {
    const url = new URL(ENDPOINT)
    url.searchParams.set('q', chunk)
    url.searchParams.set('langpair', `${direction.from}|${direction.to}`)
    let response
    try {
      response = await fetchImpl(url, { signal })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      return { ok: false, error: '翻译没有连上，请检查网络后再试。' }
    }
    if (!response.ok) return { ok: false, error: '翻译暂时不可用，请稍后再试。' }
    let data
    try {
      data = await response.json()
    } catch {
      return { ok: false, error: '翻译暂时不可用，请稍后再试。' }
    }
    const parsed = parseMyMemory(data)
    if (!parsed.ok) return parsed
    pieces.push(parsed.text)
  }

  const joiner = direction.english ? ' ' : ''
  return { ok: true, text: pieces.join(joiner).trim(), direction }
}
