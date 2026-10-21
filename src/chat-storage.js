import { readJson, writeJson } from './storage.js'

export const CHAT_STORAGE_KEY = 'kaikou.chat.v1'
export const MAX_STORED_MESSAGES = 40

function cleanCorrection(item) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.part !== 'string' || typeof item.fixed !== 'string' || typeof item.why !== 'string') return null
  const part = item.part.trim()
  const fixed = item.fixed.trim()
  const why = item.why.trim()
  if (!part || !fixed || !why) return null
  return { part, fixed, why }
}

function cleanMessage(item) {
  if (!item || (item.role !== 'user' && item.role !== 'assistant')) return null
  if (typeof item.text !== 'string' || !item.text.trim()) return null
  const message = {
    id: typeof item.id === 'string' && item.id ? item.id : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role: item.role,
    text: item.text,
    at: typeof item.at === 'number' ? item.at : Date.now(),
  }
  if (item.role === 'user' && Array.isArray(item.corrections)) {
    message.corrections = item.corrections.map(cleanCorrection).filter(Boolean).slice(0, 3)
  }
  return message
}

export function loadChat() {
  const saved = readJson(CHAT_STORAGE_KEY, null)
  const list = saved && Array.isArray(saved.messages) ? saved.messages : []
  return list.map(cleanMessage).filter(Boolean).slice(-MAX_STORED_MESSAGES)
}

export function saveChat(messages) {
  const next = (Array.isArray(messages) ? messages : []).map(cleanMessage).filter(Boolean).slice(-MAX_STORED_MESSAGES)
  writeJson(CHAT_STORAGE_KEY, { messages: next })
  return next
}

export function clearChat() {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
  } catch {
    // Private mode can refuse storage. The page still works for this visit.
  }
}
