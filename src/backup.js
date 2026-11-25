import {
  BACKUP_KEYS,
  GRAMMAR_KEY,
  HOME_TIP_KEY,
  JA_WORD_KEY,
  RATE_KEY,
  READ_KEY,
  READING_PROGRESS_KEY,
  SNAPSHOT_KEY,
  STUDY_LANG_KEY,
  TAB_KEY,
  TRANSLATE_KEY,
  WORD_KEY,
} from './storage-keys.js'
import { loadGrammar } from './grammar-progress.js'
import { loadQuiz } from './quiz-progress.js'
import { loadReadingProgress } from './reading-progress.js'

export const BACKUP_FORMAT = 'kaikou-backup'
export const BACKUP_VERSION = 1
export const BACKUP_MAX_CHARS = 2_000_000

const STRING_KEYS = new Set([RATE_KEY, TAB_KEY, STUDY_LANG_KEY, HOME_TIP_KEY, READ_KEY])
const DUE_RE = /^\d{4}-\d{2}-\d{2}$/
const JA_ID_RE = /^(?:w|k):\d+$|^c:\d+:(?:masu|te|ta|pot)$/

export function collectRawKeys(getItem, keys = BACKUP_KEYS) {
  const out = {}
  for (const key of keys) {
    let raw = null
    try {
      raw = getItem(key)
    } catch {
      return { ok: false, error: '浏览器没有允许读取本机记录。没有改动任何数据。' }
    }
    if (typeof raw === 'string') out[key] = raw
  }
  return { ok: true, keys: out }
}

export function buildBackup(getItem, exportedAt) {
  const collected = collectRawKeys(getItem)
  if (!collected.ok) return collected
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      note: '开口学习数据备份。只含 localStorage 里的单词、翻译、内置刷题和语法。不含 IndexedDB 里的个人官方资料、原卷和音频。这不是官方成绩单。',
      keys: collected.keys,
    },
  }
}

function cardOk(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return false
  const interval = Number(card.interval)
  const ease = Number(card.ease)
  const reps = Number(card.reps)
  const lapses = Number(card.lapses)
  if (!Number.isFinite(interval) || interval < 0) return false
  if (!Number.isFinite(ease) || !Number.isFinite(reps) || !Number.isFinite(lapses)) return false
  if (typeof card.due !== 'string' || !DUE_RE.test(card.due)) return false
  return true
}

function validateCards(value, idOk, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${label}不是对象，整份备份没有写入。`
  if (!value.cards || typeof value.cards !== 'object' || Array.isArray(value.cards)) return `${label}缺少词条，整份备份没有写入。`
  for (const [id, card] of Object.entries(value.cards)) {
    if (!idOk(id)) return `${label}里有不认识的编号 ${id}，整份备份没有写入。`
    if (!cardOk(card)) return `${label}里 ${id} 的复习数据不完整，整份备份没有写入。`
  }
  return ''
}

function validateQuizValue(value) {
  const loaded = loadQuiz(value)
  return loaded.ok ? '' : `${loaded.error}整份备份没有写入。`
}

function validateGrammarValue(value) {
  const loaded = loadGrammar(value)
  return loaded.ok ? '' : `${loaded.error}整份备份没有写入。`
}

function validateTranslate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '翻译草稿损坏，整份没有写入。'
  for (const key of ['source', 'result', 'label']) {
    if (value[key] != null && typeof value[key] !== 'string') return '翻译草稿损坏，整份没有写入。'
  }
  return ''
}

function validateParsed(key, value, raw) {
  if (STRING_KEYS.has(key)) {
    if (raw.length > 200_000) return `${key} 太长，整份没有写入。`
    return ''
  }
  if (key === WORD_KEY) return validateCards(value, (id) => /^\d+$/.test(id), '英语单词记录')
  if (key === JA_WORD_KEY) return validateCards(value, (id) => JA_ID_RE.test(id), '日语单词记录')
  if (key === TRANSLATE_KEY) return validateTranslate(value)
  if (key === 'kaikou.quiz.v1') return validateQuizValue(value)
  if (key === GRAMMAR_KEY) return validateGrammarValue(value)
  if (key === READING_PROGRESS_KEY) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '阅读进度损坏，整份没有写入。'
    return ''
  }
  return `不认识的记录 ${key}，整份没有写入。`
}

export function parseBackupText(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: '文件是空的。本机记录没有改。' }
  if (text.length > BACKUP_MAX_CHARS) return { ok: false, error: '文件太大。本机记录没有改。' }
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '文件读不出来。本机记录没有改。' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: '这不是开口的备份。本机记录没有改。' }
  if (data.format !== BACKUP_FORMAT || data.version !== BACKUP_VERSION) {
    return { ok: false, error: '这不是开口学习备份，或版本对不上。本机记录没有改。' }
  }
  if (!data.keys || typeof data.keys !== 'object' || Array.isArray(data.keys)) {
    return { ok: false, error: '备份里没有记录清单。本机记录没有改。' }
  }
  const unknown = Object.keys(data.keys).filter((key) => !BACKUP_KEYS.includes(key))
  if (unknown.length) return { ok: false, error: `有不认识的记录：${unknown.join('、')}。整份没有写入。` }
  const parsed = {}
  for (const [key, raw] of Object.entries(data.keys)) {
    if (typeof raw !== 'string') return { ok: false, error: `${key} 不是原文。本机记录没有改。` }
    if (STRING_KEYS.has(key)) {
      const problem = validateParsed(key, raw, raw)
      if (problem) return { ok: false, error: problem }
      parsed[key] = { raw, value: raw }
      continue
    }
    let value
    try {
      value = JSON.parse(raw)
    } catch {
      return { ok: false, error: `${key} 损坏。整份没有写入。` }
    }
    const problem = validateParsed(key, value, raw)
    if (problem) return { ok: false, error: problem }
    parsed[key] = { raw, value }
  }
  return { ok: true, parsed }
}

export function describeBackup(parsed) {
  const lines = []
  const wordCards = parsed[WORD_KEY]?.value?.cards
  const jaCards = parsed[JA_WORD_KEY]?.value?.cards
  lines.push(`英语单词记录 ${wordCards ? Object.keys(wordCards).length : 0} 条`)
  lines.push(`日语单词记录 ${jaCards ? Object.keys(jaCards).length : 0} 条`)
  const answers = parsed['kaikou.quiz.v1']?.value?.answers
  lines.push(`刷题作答 ${answers ? Object.keys(answers).length : 0} 题`)
  const points = parsed[GRAMMAR_KEY]?.value?.points
  lines.push(`语法进度 ${points ? Object.keys(points).length : 0} 条`)
  const reading = parsed[READING_PROGRESS_KEY]?.value?.articles
  lines.push(`阅读进度 ${reading && typeof reading === 'object' ? Object.keys(reading).length : 0} 篇`)
  lines.push(`备份里共有 ${Object.keys(parsed).length} 项本机记录`)
  return lines
}

function snapshotFrom(getItem) {
  const keys = {}
  for (const key of [...BACKUP_KEYS, SNAPSHOT_KEY]) {
    let raw = null
    try {
      raw = getItem(key)
    } catch {
      return { ok: false, error: '读不到本机记录，已停止。没有写入。' }
    }
    keys[key] = typeof raw === 'string' ? raw : null
  }
  return { ok: true, keys }
}

function restoreSnapshot(snapshot, getItem, setItem, removeItem) {
  for (const [key, raw] of Object.entries(snapshot)) {
    const current = getItem(key)
    const now = typeof current === 'string' ? current : null
    const next = typeof raw === 'string' ? raw : null
    if (now === next) continue
    if (typeof raw === 'string') setItem(key, raw)
    else removeItem(key)
  }
}

function mergeCardStore(localRaw, backupValue) {
  if (typeof localRaw !== 'string') return { raw: JSON.stringify(backupValue), changed: true }
  let local
  try {
    local = JSON.parse(localRaw)
  } catch {
    return { error: '本机单词记录损坏。合并已停止，没有覆盖。请先把原文件存下来，或改用「覆盖」并确认。' }
  }
  const localCards = local && local.cards && typeof local.cards === 'object' ? local.cards : null
  if (!localCards) return { error: '本机单词记录读不出来。合并已停止，没有覆盖。' }
  const cards = { ...localCards }
  let added = 0
  for (const [id, card] of Object.entries(backupValue.cards)) {
    if (cards[id] == null) {
      cards[id] = card
      added += 1
    }
  }
  if (added === 0) return { raw: localRaw, changed: false }
  return { raw: JSON.stringify({ ...local, cards }), changed: true, added }
}

function mergeQuiz(localRaw, backupValue) {
  if (typeof localRaw !== 'string') return { raw: JSON.stringify(backupValue), changed: true }
  let local
  try {
    local = JSON.parse(localRaw)
  } catch {
    return { error: '本机刷题记录损坏。合并已停止，没有覆盖。' }
  }
  if (local.answers != null && (typeof local.answers !== 'object' || Array.isArray(local.answers))) {
    return { error: '本机刷题记录损坏。合并已停止，没有覆盖。' }
  }
  if (local.history != null && !Array.isArray(local.history)) {
    return { error: '本机刷题记录损坏。合并已停止，没有覆盖。' }
  }
  const answers = { ...(local.answers || {}) }
  let added = 0
  for (const [id, row] of Object.entries(backupValue.answers || {})) {
    if (answers[id] == null) {
      answers[id] = row
      added += 1
    }
  }
  const favorites = { ...(local.favorites || {}) }
  for (const [id, flag] of Object.entries(backupValue.favorites || {})) {
    if (flag === true && favorites[id] !== true) {
      favorites[id] = true
      added += 1
    }
  }
  const wrong = { ...(local.wrong || {}) }
  for (const [id, row] of Object.entries(backupValue.wrong || {})) {
    if (wrong[id] == null && answers[id]?.correct === false) {
      wrong[id] = row
      added += 1
    }
  }
  const seen = new Set((local.history || []).map((row) => `${row.questionId}|${row.at}|${row.choice}`))
  const history = (local.history || []).slice()
  for (const row of backupValue.history || []) {
    const mark = `${row.questionId}|${row.at}|${row.choice}`
    if (!seen.has(mark)) {
      history.push(row)
      seen.add(mark)
      added += 1
    }
  }
  const resume = local.resume != null ? local.resume : backupValue.resume || null
  if (added === 0 && (local.resume != null || backupValue.resume == null)) return { raw: localRaw, changed: false }
  if (added === 0 && local.resume == null && backupValue.resume) added = 1
  if (added === 0) return { raw: localRaw, changed: false }
  return {
    raw: JSON.stringify({ ...local, version: 1, answers, history, wrong, favorites, resume }),
    changed: true,
  }
}

function mergeGrammar(localRaw, backupValue) {
  if (typeof localRaw !== 'string') return { raw: JSON.stringify(backupValue), changed: true }
  let local
  try {
    local = JSON.parse(localRaw)
  } catch {
    return { error: '本机语法记录损坏。合并已停止，没有覆盖。' }
  }
  if (local.points != null && (typeof local.points !== 'object' || Array.isArray(local.points))) {
    return { error: '本机语法记录损坏。合并已停止，没有覆盖。' }
  }
  const points = { ...(local.points || {}) }
  let added = 0
  for (const [id, row] of Object.entries(backupValue.points || {})) {
    if (points[id] == null) {
      points[id] = row
      added += 1
    }
  }
  if (added === 0) return { raw: localRaw, changed: false }
  return { raw: JSON.stringify({ ...local, version: 1, points }), changed: true }
}

function mergeReading(localRaw, incoming) {
  let local = { articles: {} }
  if (typeof localRaw === 'string' && localRaw) {
    try {
      local = loadReadingProgress(JSON.parse(localRaw))
    } catch {
      return { error: '本机阅读进度读不出来。合并已停止，没有覆盖。' }
    }
  }
  const remote = loadReadingProgress(incoming)
  const articles = { ...remote.articles }
  for (const [id, row] of Object.entries(local.articles)) {
    const other = articles[id]
    if (!other) {
      articles[id] = row
      continue
    }
    articles[id] = {
      openedAt: row.openedAt || other.openedAt,
      read: row.read === true || other.read === true,
    }
  }
  return { raw: JSON.stringify({ articles }), changed: JSON.stringify({ articles }) !== localRaw }
}

function mergeOne(key, localRaw, packed) {
  if (STRING_KEYS.has(key)) {
    if (typeof localRaw === 'string') return { raw: localRaw, changed: false }
    return { raw: packed.raw, changed: true }
  }
  if (key === WORD_KEY || key === JA_WORD_KEY) return mergeCardStore(localRaw, packed.value)
  if (key === 'kaikou.quiz.v1') return mergeQuiz(localRaw, packed.value)
  if (key === GRAMMAR_KEY) return mergeGrammar(localRaw, packed.value)
  if (key === READING_PROGRESS_KEY) return mergeReading(localRaw, packed.value)
  if (typeof localRaw === 'string') return { raw: localRaw, changed: false }
  return { raw: packed.raw, changed: true }
}

export function applyBackup({ mode, parsed, getItem, setItem, removeItem }) {
  if (mode !== 'merge' && mode !== 'replace') return { ok: false, error: '没有选择合并或覆盖。本机记录没有改。' }
  const shot = snapshotFrom(getItem)
  if (!shot.ok) return shot
  const writes = []
  for (const [key, packed] of Object.entries(parsed)) {
    let raw = null
    try {
      raw = getItem(key)
    } catch {
      return { ok: false, error: '读不到本机记录，已停止。没有写入。' }
    }
    const localRaw = typeof raw === 'string' ? raw : null
    if (mode === 'replace') {
      if (localRaw !== packed.raw) writes.push([key, packed.raw])
      continue
    }
    const merged = mergeOne(key, localRaw, packed)
    if (merged.error) return { ok: false, error: merged.error }
    if (merged.changed) writes.push([key, merged.raw])
  }
  if (!writes.length) return { ok: true, changed: 0, snapshot: false }
  const snapshotText = JSON.stringify({ version: 1, reason: mode, keys: shot.keys })
  const savedShot = writeThrough(SNAPSHOT_KEY, snapshotText, setItem)
  if (!savedShot.ok) return { ok: false, error: '无法先留下恢复快照，已停止。本机学习记录没有改。' }
  const done = []
  for (const [key, raw] of writes) {
    const result = writeThrough(key, raw, setItem)
    if (!result.ok) {
      try {
        restoreSnapshot(shot.keys, getItem, setItem, removeItem)
      } catch {
        return { ok: false, error: '写入中断，而且自动恢复也失败。请马上用刚才导出的文件再试。' }
      }
      return { ok: false, error: result.reason === 'quota' ? '存储满了，已退回刚才的记录。' : '浏览器拒绝保存，已退回刚才的记录。' }
    }
    done.push(key)
  }
  return { ok: true, changed: done.length, keys: done, snapshot: true }
}

function writeThrough(key, raw, setItem) {
  try {
    setItem(key, raw)
    return { ok: true }
  } catch (error) {
    const name = error && error.name ? error.name : ''
    const quota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(String(error))
    return { ok: false, reason: quota ? 'quota' : 'blocked' }
  }
}

export function undoLastImport(getItem, setItem, removeItem) {
  let raw = null
  try {
    raw = getItem(SNAPSHOT_KEY)
  } catch {
    return { ok: false, error: '恢复快照读不出来。学习记录没有再改。' }
  }
  if (typeof raw !== 'string') return { ok: false, error: '没有可撤销的导入。' }
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return { ok: false, error: '恢复快照读不出来。学习记录没有再改。' }
  }
  if (!value || typeof value.keys !== 'object') return { ok: false, error: '恢复快照读不出来。学习记录没有再改。' }
  try {
    restoreSnapshot(value.keys, getItem, setItem, removeItem)
  } catch {
    return { ok: false, error: '撤销没有完成。' }
  }
  return { ok: true }
}

export function browserStorage() {
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  }
}

export function downloadName(exportedAt) {
  const stamp = String(exportedAt || '').replace(/[:.]/g, '-')
  return `kaikou-backup-${stamp || 'export'}.json`
}
