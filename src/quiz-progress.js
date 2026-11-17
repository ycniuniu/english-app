import { QUIZ_KEY } from './storage-keys.js'
import { readStorageEntry, writeJsonResult } from './storage.js'

export const QUIZ_VERSION = 1
export const HISTORY_LIMIT = 300

const KNOWN = new Set(['version', 'answers', 'history', 'wrong', 'favorites', 'resume', 'extra'])

export function emptyQuiz() {
  return {
    version: QUIZ_VERSION,
    answers: {},
    history: [],
    wrong: {},
    favorites: {},
    resume: null,
    extra: {},
  }
}

function answerOk(row) {
  return Boolean(row) && typeof row === 'object' && !Array.isArray(row) && typeof row.choice === 'string' && typeof row.correct === 'boolean' && typeof row.at === 'string' && row.at.length > 0
}

function resumeOk(resume) {
  if (resume == null) return true
  if (typeof resume !== 'object' || Array.isArray(resume)) return false
  if (typeof resume.exam !== 'string' || typeof resume.level !== 'string') return false
  if (typeof resume.type !== 'string' || (resume.order !== 'seq' && resume.order !== 'rand')) return false
  if (!Array.isArray(resume.ids) || resume.ids.some((id) => typeof id !== 'string' || !id)) return false
  if (!Number.isInteger(resume.index) || resume.index < 0) return false
  if (typeof resume.at !== 'string') return false
  return true
}

export function loadQuiz(value) {
  if (value == null) return { ok: true, empty: true, state: emptyQuiz() }
  if (typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: '刷题记录损坏，没有覆盖。' }
  const version = value.version == null ? 1 : value.version
  if (version !== QUIZ_VERSION) return { ok: false, error: '刷题记录的版本读不了，没有覆盖。' }
  const state = emptyQuiz()
  if (value.answers != null) {
    if (typeof value.answers !== 'object' || Array.isArray(value.answers)) return { ok: false, error: '作答记录损坏，没有覆盖。' }
    for (const [id, row] of Object.entries(value.answers)) {
      if (!answerOk(row)) return { ok: false, error: `题目 ${id} 的作答读不出来，没有覆盖。` }
      state.answers[id] = { ...row }
    }
  }
  if (value.history != null) {
    if (!Array.isArray(value.history)) return { ok: false, error: '作答历史损坏，没有覆盖。' }
    for (const row of value.history) {
      if (!row || typeof row.questionId !== 'string' || !answerOk(row)) return { ok: false, error: '作答历史里有一条读不出来，没有覆盖。' }
      state.history.push({ ...row })
    }
  }
  if (value.wrong != null) {
    if (typeof value.wrong !== 'object' || Array.isArray(value.wrong)) return { ok: false, error: '错题本损坏，没有覆盖。' }
    for (const [id, row] of Object.entries(value.wrong)) {
      if (!row || typeof row !== 'object' || !Number.isFinite(Number(row.misses)) || Number(row.misses) < 1 || typeof row.lastAt !== 'string') {
        return { ok: false, error: `错题 ${id} 读不出来，没有覆盖。` }
      }
      state.wrong[id] = { ...row, misses: Math.round(Number(row.misses)) }
    }
  }
  if (value.favorites != null) {
    if (typeof value.favorites !== 'object' || Array.isArray(value.favorites)) return { ok: false, error: '收藏损坏，没有覆盖。' }
    for (const [id, flag] of Object.entries(value.favorites)) {
      if (flag !== true) return { ok: false, error: `收藏 ${id} 读不出来，没有覆盖。` }
      state.favorites[id] = true
    }
  }
  if (!resumeOk(value.resume)) return { ok: false, error: '未做完的练习读不出来，没有覆盖。' }
  state.resume = value.resume ? { ...value.resume, ids: value.resume.ids.slice() } : null
  const extra = value.extra && typeof value.extra === 'object' && !Array.isArray(value.extra) ? { ...value.extra } : {}
  for (const [key, item] of Object.entries(value)) {
    if (!KNOWN.has(key)) extra[key] = item
  }
  state.extra = extra
  return { ok: true, empty: false, state }
}

export function readQuizStore() {
  const entry = readStorageEntry(QUIZ_KEY)
  if (entry.status === 'blocked') return { status: 'blocked', state: emptyQuiz(), raw: null }
  if (entry.status === 'corrupt') return { status: 'corrupt', state: emptyQuiz(), raw: entry.raw }
  if (entry.status === 'empty') return { status: 'empty', state: emptyQuiz(), raw: null }
  const loaded = loadQuiz(entry.value)
  if (!loaded.ok) return { status: 'corrupt', state: emptyQuiz(), raw: entry.raw, error: loaded.error }
  return { status: loaded.empty ? 'empty' : 'ok', state: loaded.state, raw: entry.raw }
}

export function serializeQuiz(state) {
  const extra = state.extra && typeof state.extra === 'object' ? state.extra : {}
  return {
    ...extra,
    version: QUIZ_VERSION,
    answers: state.answers,
    history: state.history,
    wrong: state.wrong,
    favorites: state.favorites,
    resume: state.resume,
    extra,
  }
}

export function persistQuiz(state) {
  return writeJsonResult(QUIZ_KEY, serializeQuiz(state))
}

export function answerQuestion(state, question, choice, at) {
  const correct = choice === question.answer
  const row = { choice, correct, at }
  const answers = { ...state.answers, [question.id]: row }
  const history = state.history.concat([{ questionId: question.id, ...row }])
  const trimmed = history.length > HISTORY_LIMIT ? history.slice(history.length - HISTORY_LIMIT) : history
  const wrong = { ...state.wrong }
  if (correct) delete wrong[question.id]
  else {
    const prev = state.wrong[question.id]
    wrong[question.id] = { misses: (prev?.misses || 0) + 1, lastAt: at }
  }
  return { ...state, answers, history: trimmed, wrong }
}

export function toggleFavorite(state, questionId) {
  const favorites = { ...state.favorites }
  if (favorites[questionId]) delete favorites[questionId]
  else favorites[questionId] = true
  return { ...state, favorites }
}

export function withResume(state, resume) {
  return { ...state, resume }
}

export function clearResume(state) {
  return { ...state, resume: null }
}

export function shuffleIds(ids, seed) {
  const list = ids.slice()
  let next = seed >>> 0
  for (let index = list.length - 1; index > 0; index -= 1) {
    next = (Math.imul(1664525, next) + 1013904223) >>> 0
    const swap = next % (index + 1)
    const hold = list[index]
    list[index] = list[swap]
    list[swap] = hold
  }
  return list
}

export function questionsFor(questions, { exam, level = '', type = '' }) {
  return questions
    .filter((item) => item.exam === exam && (level === '' || item.level === level) && (type === '' || item.type === type))
    .slice()
    .sort((a, b) => a.order - b.order)
}

export function summarizeQuestions(state, questions) {
  let attempted = 0
  let correct = 0
  for (const item of questions) {
    const row = state.answers[item.id]
    if (!row) continue
    attempted += 1
    if (row.correct) correct += 1
  }
  return {
    total: questions.length,
    attempted,
    correct,
    wrong: attempted - correct,
    unseen: questions.length - attempted,
  }
}

export function wrongIds(state, questions) {
  const known = new Set(questions.map((item) => item.id))
  return Object.keys(state.wrong).filter((id) => known.has(id) && state.answers[id] && state.answers[id].correct === false)
}

export function favoriteIds(state, questions) {
  const known = new Set(questions.map((item) => item.id))
  return Object.keys(state.favorites).filter((id) => known.has(id))
}
