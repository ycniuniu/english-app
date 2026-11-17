import { addDays, todayKey } from './srs.js'
import { GRAMMAR_KEY } from './storage-keys.js'
import { readStorageEntry, writeJsonResult } from './storage.js'

export const GRAMMAR_VERSION = 1
export const REVIEW_GAP_DAYS = 3

const KNOWN = new Set(['version', 'points', 'extra'])

export function emptyGrammar() {
  return { version: GRAMMAR_VERSION, points: {}, extra: {} }
}

function pointOk(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  if (typeof row.learned !== 'boolean' || typeof row.favorite !== 'boolean') return false
  if (!(row.learnedAt == null || typeof row.learnedAt === 'string')) return false
  if (!(row.reviewOn == null || (typeof row.reviewOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.reviewOn)))) return false
  if (!(row.lastResult == null || row.lastResult === 'ok' || row.lastResult === 'miss')) return false
  if (row.exercise != null && (typeof row.exercise !== 'object' || typeof row.exercise.choice !== 'string' || typeof row.exercise.correct !== 'boolean' || typeof row.exercise.at !== 'string')) {
    return false
  }
  if (row.exercises != null) {
    if (typeof row.exercises !== 'object' || Array.isArray(row.exercises)) return false
    for (const item of Object.values(row.exercises)) {
      if (!item || typeof item.choice !== 'string' || typeof item.correct !== 'boolean' || typeof item.at !== 'string') return false
    }
  }
  return true
}

export function loadGrammar(value) {
  if (value == null) return { ok: true, empty: true, state: emptyGrammar() }
  if (typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: '语法记录损坏，没有覆盖。' }
  const version = value.version == null ? 1 : value.version
  if (version !== GRAMMAR_VERSION) return { ok: false, error: '语法记录的版本读不了，没有覆盖。' }
  const state = emptyGrammar()
  if (value.points != null) {
    if (typeof value.points !== 'object' || Array.isArray(value.points)) return { ok: false, error: '语法进度损坏，没有覆盖。' }
    for (const [id, row] of Object.entries(value.points)) {
      if (!pointOk(row)) return { ok: false, error: `语法点 ${id} 读不出来，没有覆盖。` }
      state.points[id] = {
        ...row,
        exercise: row.exercise ? { ...row.exercise } : null,
      exercises: row.exercises ? { ...row.exercises } : row.exercises,
      }
    }
  }
  const extra = value.extra && typeof value.extra === 'object' && !Array.isArray(value.extra) ? { ...value.extra } : {}
  for (const [key, item] of Object.entries(value)) {
    if (!KNOWN.has(key)) extra[key] = item
  }
  state.extra = extra
  return { ok: true, empty: false, state }
}

export function readGrammarStore() {
  const entry = readStorageEntry(GRAMMAR_KEY)
  if (entry.status === 'blocked') return { status: 'blocked', state: emptyGrammar(), raw: null }
  if (entry.status === 'corrupt') return { status: 'corrupt', state: emptyGrammar(), raw: entry.raw }
  if (entry.status === 'empty') return { status: 'empty', state: emptyGrammar(), raw: null }
  const loaded = loadGrammar(entry.value)
  if (!loaded.ok) return { status: 'corrupt', state: emptyGrammar(), raw: entry.raw, error: loaded.error }
  return { status: loaded.empty ? 'empty' : 'ok', state: loaded.state, raw: entry.raw }
}

export function serializeGrammar(state) {
  const extra = state.extra && typeof state.extra === 'object' ? state.extra : {}
  return { ...extra, version: GRAMMAR_VERSION, points: state.points, extra }
}

export function persistGrammar(state) {
  return writeJsonResult(GRAMMAR_KEY, serializeGrammar(state))
}

function rowOf(state, id) {
  return (
    state.points[id] || {
      learned: false,
      learnedAt: null,
      favorite: false,
      reviewOn: null,
      lastResult: null,
      exercise: null,
    }
  )
}

export function setLearned(state, id, learned, today = todayKey()) {
  const prev = rowOf(state, id)
  const points = {
    ...state.points,
    [id]: {
      ...prev,
      learned,
      learnedAt: learned ? prev.learnedAt || today : null,
      reviewOn: learned ? addDays(today, REVIEW_GAP_DAYS) : null,
    },
  }
  return { ...state, points }
}

export function toggleGrammarFavorite(state, id) {
  const prev = rowOf(state, id)
  const points = { ...state.points, [id]: { ...prev, favorite: !prev.favorite } }
  return { ...state, points }
}

export function recordDrill(state, id, index, choice, correct, at, today = todayKey()) {
  const prev = rowOf(state, id)
  const exercises = { ...(prev.exercises || {}), [String(index)]: { choice, correct, at } }
  const points = {
    ...state.points,
    [id]: {
      ...prev,
      exercises,
      exercise: { choice, correct, at },
      lastResult: correct ? 'ok' : 'miss',
      reviewOn: correct ? addDays(today, REVIEW_GAP_DAYS) : today,
    },
  }
  return { ...state, points }
}

export function recordExercise(state, id, choice, correct, at, today = todayKey()) {
  const prev = rowOf(state, id)
  const points = {
    ...state.points,
    [id]: {
      ...prev,
      lastResult: correct ? 'ok' : 'miss',
      exercise: { choice, correct, at },
      reviewOn: correct ? addDays(today, REVIEW_GAP_DAYS) : today,
    },
  }
  return { ...state, points }
}

export function dueGrammarIds(state, points, today = todayKey()) {
  const ids = []
  for (const point of points) {
    const row = state.points[point.id]
    if (row?.reviewOn && row.reviewOn <= today) ids.push(point.id)
  }
  return ids
}
