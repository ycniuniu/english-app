export const NEW_BATCH = 15
export const FAMILIAR_INTERVAL = 7
export const MASTER_INTERVAL = 21
export const STORAGE_KEY = 'kaikou.words.v1'

const DUE_RE = /^\d{4}-\d{2}-\d{2}$/

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(key, days) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function daysBetween(fromKey, toKey) {
  const [y1, m1, d1] = fromKey.split('-').map(Number)
  const [y2, m2, d2] = toKey.split('-').map(Number)
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  return Math.round((end - start) / 86400000)
}

export function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/\s+/g, ' ')
}

export function answersMatch(input, word) {
  const left = normalizeAnswer(input)
  const right = normalizeAnswer(word)
  return left.length > 0 && left === right
}

function round2(value) {
  return Math.round(value * 100 + Number.EPSILON) / 100
}

export function gradeCard(card, correct, today) {
  const prev = card ?? { interval: 0, ease: 2.3, reps: 0, lapses: 0, due: today }
  const ease0 = Number.isFinite(prev.ease) ? prev.ease : 2.3
  const interval0 = Number.isFinite(prev.interval) ? prev.interval : 0
  const reps0 = Number.isFinite(prev.reps) ? prev.reps : 0
  const lapses0 = Number.isFinite(prev.lapses) ? prev.lapses : 0

  if (correct) {
    let interval = 1
    if (interval0 === 1) interval = 3
    else if (interval0 > 1) interval = Math.max(interval0 + 1, Math.round(interval0 * ease0))
    return {
      interval,
      ease: Math.min(2.8, round2(ease0 + 0.04)),
      reps: reps0 + 1,
      lapses: lapses0,
      due: addDays(today, interval),
    }
  }

  return {
    interval: Math.max(1, Math.round(interval0 * 0.4)),
    ease: Math.max(1.3, round2(ease0 - 0.18)),
    reps: Math.max(0, reps0 - 1),
    lapses: lapses0 + 1,
    due: today,
  }
}

export function cardOf(cards, id) {
  if (!cards) return null
  return cards[id] ?? cards[String(id)] ?? null
}

export function needsPreview(card) {
  if (!card) return true
  return card.reps === 0 && card.lapses === 0
}

export function buildQueueFromIds(cards, ids, today, newBatch = NEW_BATCH) {
  const due = []
  for (const id of ids) {
    const card = cardOf(cards, id)
    if (card && card.due <= today) due.push(id)
  }
  due.sort((a, b) => {
    const da = cardOf(cards, a).due
    const db = cardOf(cards, b).due
    if (da < db) return -1
    if (da > db) return 1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    const as = String(a)
    const bs = String(b)
    if (as < bs) return -1
    if (as > bs) return 1
    return 0
  })

  const fresh = []
  const batch = Math.max(0, newBatch)
  if (batch > 0) {
    for (const id of ids) {
      if (fresh.length >= batch) break
      if (!cardOf(cards, id)) fresh.push(id)
    }
  }
  return due.concat(fresh)
}

export function buildQueue(cards, total, today, newBatch = NEW_BATCH) {
  const ids = Array.from({ length: total }, (_, id) => id)
  return buildQueueFromIds(cards, ids, today, newBatch)
}

export function summarizeIds(cards, ids, today) {
  let learned = 0
  let familiar = 0
  let mastered = 0
  let due = 0
  const seen = new Set()
  for (const id of ids) {
    const key = String(id)
    if (seen.has(key)) continue
    seen.add(key)
    const card = cardOf(cards, id)
    if (!card || typeof card !== 'object') continue
    learned += 1
    if (card.interval >= FAMILIAR_INTERVAL) familiar += 1
    if (card.interval >= MASTER_INTERVAL) mastered += 1
    if (card.due <= today) due += 1
  }
  return { learned, familiar, mastered, due, fresh: Math.max(0, ids.length - learned), total: ids.length }
}

export function summarize(cards, total, today) {
  let learned = 0
  let familiar = 0
  let mastered = 0
  let due = 0
  const seen = new Set()
  for (const [id, card] of Object.entries(cards || {})) {
    const n = Number(id)
    if (!Number.isInteger(n) || n < 0 || n >= total || seen.has(n)) continue
    if (!card || typeof card !== 'object') continue
    seen.add(n)
    learned += 1
    if (card.interval >= FAMILIAR_INTERVAL) familiar += 1
    if (card.interval >= MASTER_INTERVAL) mastered += 1
    if (card.due <= today) due += 1
  }
  return { learned, familiar, mastered, due, fresh: Math.max(0, total - learned), total }
}

export function duePhrase(card, today) {
  if (!card || card.due <= today) return '今天还会再出现'
  const days = daysBetween(today, card.due)
  if (days <= 1) return '下次明天再出现'
  return `下次 ${days} 天后再出现`
}

export function loadProgress(raw) {
  const cards = {}
  const source = raw && typeof raw === 'object' ? raw.cards : null
  if (!source || typeof source !== 'object') return { cards }
  for (const [id, card] of Object.entries(source)) {
    if (!/^\d+$/.test(id) || !card || typeof card !== 'object') continue
    const interval = Number(card.interval)
    const ease = Number(card.ease)
    const reps = Number(card.reps)
    const lapses = Number(card.lapses)
    if (!Number.isFinite(interval) || interval < 0) continue
    if (!Number.isFinite(ease) || !Number.isFinite(reps) || !Number.isFinite(lapses)) continue
    if (typeof card.due !== 'string' || !DUE_RE.test(card.due)) continue
    cards[String(Number(id))] = {
      interval: Math.round(interval),
      ease: Math.min(2.8, Math.max(1.3, ease)),
      reps: Math.max(0, Math.round(reps)),
      lapses: Math.max(0, Math.round(lapses)),
      due: card.due,
    }
  }
  return { cards }
}
