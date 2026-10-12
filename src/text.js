const ABBR =
  /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Sr|Jr|St|vs|etc|No|e\.g|i\.e|U\.S|U\.K|a\.m|p\.m)\.$/i

const CLOSERS = /["'”’)\]]/

export function normalizeSpeechText(raw) {
  return String(raw ?? '')
    .replace(/[．｡]/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitSentences(raw) {
  const cleaned = normalizeSpeechText(raw)
  if (!cleaned) return []

  const sentences = []
  let buf = ''

  const push = (index) => {
    const sentence = buf.trim()
    if (sentence) sentences.push(sentence)
    buf = ''
    let next = index
    while (cleaned[next + 1] === ' ') next += 1
    return next
  }

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i]
    buf += ch

    if (ch === '.' || ch === '…') {
      while (cleaned[i + 1] === '.') {
        i += 1
        buf += cleaned[i]
      }
      const isEllipsis = ch === '…' || buf.endsWith('..')
      if (isEllipsis) continue

      const next = cleaned[i + 1] || ''
      const prev = cleaned[i - 1] || ''
      if (/\d/.test(prev) && /\d/.test(next)) continue
      if (/[A-Za-z]/.test(next)) continue
      if (ABBR.test(buf)) continue

      while (i + 1 < cleaned.length && CLOSERS.test(cleaned[i + 1])) {
        i += 1
        buf += cleaned[i]
      }
      i = push(i)
      continue
    }

    if ('!?！？。'.includes(ch)) {
      while (i + 1 < cleaned.length && '!?！？'.includes(cleaned[i + 1])) {
        i += 1
        buf += cleaned[i]
      }
      while (i + 1 < cleaned.length && CLOSERS.test(cleaned[i + 1])) {
        i += 1
        buf += cleaned[i]
      }
      i = push(i)
    }
  }

  const tail = buf.trim()
  if (tail) sentences.push(tail)
  return sentences
}

function breakWords(text, maxLen) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let buf = ''
  for (const word of words) {
    if (word.length > maxLen) {
      if (buf) chunks.push(buf)
      buf = ''
      for (let i = 0; i < word.length; i += maxLen) {
        chunks.push(word.slice(i, i + maxLen))
      }
      continue
    }
    if (!buf) buf = word
    else if (buf.length + 1 + word.length <= maxLen) buf = `${buf} ${word}`
    else {
      chunks.push(buf)
      buf = word
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

function breakLong(sentence, maxLen) {
  const clauses = sentence.split(/(?<=[,;:，；、])\s*/).filter(Boolean)
  const chunks = []
  let buf = ''
  const flush = () => {
    const text = buf.trim()
    if (text) chunks.push(text)
    buf = ''
  }
  for (const clause of clauses) {
    if (clause.length > maxLen) {
      flush()
      chunks.push(...breakWords(clause, maxLen))
      continue
    }
    if (!buf) buf = clause
    else if (buf.length + 1 + clause.length <= maxLen) buf = `${buf} ${clause}`
    else {
      flush()
      buf = clause
    }
  }
  flush()
  return chunks
}

export function chunkForSpeech(raw, maxLen = 160) {
  const sentences = splitSentences(raw)
  const chunks = []
  let buf = ''
  const flush = () => {
    const text = buf.trim()
    if (text) chunks.push(text)
    buf = ''
  }

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      flush()
      chunks.push(...breakLong(sentence, maxLen))
      continue
    }
    if (!buf) {
      buf = sentence
      continue
    }
    if (buf.length + 1 + sentence.length <= maxLen) buf = `${buf} ${sentence}`
    else {
      flush()
      buf = sentence
    }
  }
  flush()
  return chunks
}

export function splitForDisplay(text, complete) {
  const sentences = splitSentences(text)
  if (!sentences.length) return { ready: [], tail: '' }
  if (complete) return { ready: sentences, tail: '' }
  const trimmed = String(text ?? '').trim()
  if (/[.!?。！？]["'”’)\]]*$/.test(trimmed)) {
    return { ready: sentences, tail: '' }
  }
  return {
    ready: sentences.slice(0, -1),
    tail: sentences[sentences.length - 1],
  }
}

export function mostlyChinese(text) {
  const cjk = (String(text).match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (String(text).match(/[A-Za-z]/g) || []).length
  return cjk > 8 && cjk > latin
}
