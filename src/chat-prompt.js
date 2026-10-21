export const SYSTEM_PROMPT = `你是英语应用「开口」的对话伙伴。用户用中文或英文聊天。只输出 JSON，不要 Markdown。
reply：简单英文，最多两句，句末可加一句很短的中文。
corrections：最多 3 条。只改用户这一句英文的语法、用词、拼写。纯中文不要挑错。英文正确则用空数组。不要编造错误。
每条含 part（原句中的错误片段）、fixed（正确说法）、why（一句中文，30字内）。`

export const TOKEN_BUDGET = 500
export const MAX_MESSAGE_CHARS = 400
export const MAX_REPLY_CHARS = 400
export const MAX_WHY_CHARS = 40
export const MAX_CORRECTIONS = 3
export const MODEL = 'grok-4.7'
export const ENDPOINT = 'https://api.x.ai/v1/chat/completions'

const MESSAGE_OVERHEAD = 4

export function estimateTokens(text) {
  const value = String(text ?? '')
  let tokens = 0
  let letters = 0
  for (const ch of value) {
    if (/[A-Za-z]/.test(ch)) {
      letters += 1
      if (letters === 4) {
        tokens += 1
        letters = 0
      }
      continue
    }
    if (letters) {
      tokens += 1
      letters = 0
    }
    tokens += 1
  }
  if (letters) tokens += 1
  return tokens
}

export function estimateMessages(messages) {
  let total = 0
  for (const message of messages) {
    total += estimateTokens(message.content ?? '') + MESSAGE_OVERHEAD
  }
  return total
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function priorTurns(history) {
  if (!Array.isArray(history)) return []
  const turns = []
  for (const item of history) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant')) continue
    const text = asText(item.text ?? item.content)
    if (!text) continue
    turns.push({ role: item.role, text: text.slice(0, MAX_MESSAGE_CHARS) })
  }
  return turns
}

function toRounds(turns) {
  const rounds = []
  let index = 0
  while (index < turns.length) {
    const current = turns[index]
    const next = turns[index + 1]
    if (current.role === 'user' && next?.role === 'assistant') {
      rounds.push([current, next])
      index += 2
    } else {
      rounds.push([current])
      index += 1
    }
  }
  return rounds
}

function toApiMessages(rounds, currentText) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (const round of rounds) {
    for (const item of round) {
      messages.push({ role: item.role, content: item.text })
    }
  }
  messages.push({ role: 'user', content: currentText })
  return messages
}

export function prepareChatRequest(history, currentText) {
  const text = asText(currentText)
  if (!text) return { ok: false, error: '请先写一句话。' }
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, error: '请写短一点' }

  let rounds = toRounds(priorTurns(history))
  while (rounds.length > 0 && estimateMessages(toApiMessages(rounds, text)) > TOKEN_BUDGET) {
    rounds = rounds.slice(1)
  }
  return { ok: true, messages: toApiMessages(rounds, text) }
}

export function buildUpstreamBody(messages) {
  return {
    model: MODEL,
    messages,
    reasoning_effort: 'low',
    search_parameters: { mode: 'off' },
    max_completion_tokens: 400,
    n: 1,
    stream: false,
  }
}

export function planChatTurn(history, currentText) {
  const prepared = prepareChatRequest(history, currentText)
  if (!prepared.ok) return prepared
  return { ok: true, body: buildUpstreamBody(prepared.messages) }
}

function unwrapJson(raw) {
  let text = String(raw ?? '').trim()
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) text = fenced[1].trim()
  return text
}

function hasEnglishLetter(text) {
  return /[A-Za-z]/.test(text)
}

function matchedPart(userText, part) {
  const needle = part.trim()
  if (!needle) return ''
  const index = userText.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return ''
  return userText.slice(index, index + needle.length)
}

export function parseModelReply(raw, userText) {
  const source = String(userText ?? '')
  let data
  try {
    data = JSON.parse(unwrapJson(raw))
  } catch {
    return { ok: false, error: '这次没看懂回复，请再发一次。' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: '这次没看懂回复，请再发一次。' }
  }
  const reply = typeof data.reply === 'string' ? data.reply.trim() : ''
  if (!reply) return { ok: false, error: '这次没看懂回复，请再发一次。' }

  let corrections = []
  if (hasEnglishLetter(source) && Array.isArray(data.corrections)) {
    for (const item of data.corrections) {
      if (!item || typeof item !== 'object') continue
      if (typeof item.part !== 'string' || typeof item.fixed !== 'string' || typeof item.why !== 'string') continue
      const part = matchedPart(source, item.part)
      const fixed = item.fixed.trim()
      const why = item.why.trim().slice(0, MAX_WHY_CHARS)
      if (!part || !fixed || !why) continue
      corrections.push({ part, fixed, why })
      if (corrections.length === MAX_CORRECTIONS) break
    }
  }

  return {
    ok: true,
    reply: reply.slice(0, MAX_REPLY_CHARS),
    corrections,
  }
}
