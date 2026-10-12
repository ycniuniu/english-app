const DUE_RE = /^\d{4}-\d{2}-\d{2}$/
const ID_RE = /^(?:w|k):\d+$|^c:\d+:(?:masu|te|ta|pot)$/

export const JA_STORAGE_KEY = 'kaikou.ja.v1'

export function loadJaProgress(raw) {
  const cards = {}
  const source = raw && typeof raw === 'object' ? raw.cards : null
  if (!source || typeof source !== 'object') return { cards }
  for (const [id, card] of Object.entries(source)) {
    if (!ID_RE.test(id) || !card || typeof card !== 'object') continue
    const interval = Number(card.interval)
    const ease = Number(card.ease)
    const reps = Number(card.reps)
    const lapses = Number(card.lapses)
    if (!Number.isFinite(interval) || interval < 0) continue
    if (!Number.isFinite(ease) || !Number.isFinite(reps) || !Number.isFinite(lapses)) continue
    if (typeof card.due !== 'string' || !DUE_RE.test(card.due)) continue
    cards[id] = {
      interval: Math.round(interval),
      ease: Math.min(2.8, Math.max(1.3, ease)),
      reps: Math.max(0, Math.round(reps)),
      lapses: Math.max(0, Math.round(lapses)),
      due: card.due,
    }
  }
  return { cards }
}

export function trackIds(words, track) {
  const ids = []
  words.forEach((entry, index) => {
    if (track === 'kana') {
      if (entry.kana) ids.push(`k:${index}`)
      return
    }
    if (track === 'verb') {
      for (const form of entry.forms || []) {
        if (form.quiz) ids.push(`c:${index}:${form.key}`)
      }
      return
    }
    if (!entry.kana) ids.push(`w:${index}`)
  })
  return ids
}

export function cardItem(words, id) {
  const [kind, indexText, formKey] = id.split(':')
  const entry = words[Number(indexText)]
  if (!entry) return null
  if (kind === 'c') {
    const form = (entry.forms || []).find((item) => item.key === formKey)
    if (!form) return null
    return {
      key: id,
      kind: 'conj',
      entry,
      form,
      answers: [...new Set([form.word, form.reading].filter(Boolean))],
    }
  }
  return {
    key: id,
    kind: kind === 'k' ? 'kana' : 'word',
    entry,
    form: null,
    answers: [...new Set([entry.word, entry.reading].filter(Boolean))],
  }
}
