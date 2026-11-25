export { READING_PROGRESS_KEY } from './storage-keys.js'
const ID_RE = /^n[1-5]-\d{2}$/

export function loadReadingProgress(raw) {
  const articles = {}
  const source = raw && typeof raw === 'object' ? raw.articles : null
  if (!source || typeof source !== 'object') return { articles }
  for (const [id, row] of Object.entries(source)) {
    if (!ID_RE.test(id) || !row || typeof row !== 'object') continue
    articles[id] = {
      openedAt: typeof row.openedAt === 'string' ? row.openedAt : '',
      read: row.read === true,
    }
  }
  return { articles }
}

export function markReadingOpened(state, id, at) {
  if (!ID_RE.test(id)) return state
  const prev = state.articles[id] || { openedAt: '', read: false }
  return {
    articles: {
      ...state.articles,
      [id]: { openedAt: at, read: prev.read === true },
    },
  }
}

export function markReadingRead(state, id, read) {
  if (!ID_RE.test(id)) return state
  const prev = state.articles[id] || { openedAt: '', read: false }
  return {
    articles: {
      ...state.articles,
      [id]: { openedAt: prev.openedAt, read: read === true },
    },
  }
}
