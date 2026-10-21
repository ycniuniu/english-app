import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  TOKEN_BUDGET,
  estimateMessages,
  parseModelReply,
  planChatTurn,
  prepareChatRequest,
} from '../src/chat-prompt.js'
import { CHAT_STORAGE_KEY, clearChat, loadChat, saveChat } from '../src/chat-storage.js'

function installStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  globalThis.localStorage = {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(String(key), String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
  }
  return map
}

test('drops the oldest round and keeps the new line inside the token budget', () => {
  const history = []
  for (let index = 0; index < 12; index += 1) {
    history.push({
      role: 'user',
      text: `old user sentence number ${index} about yesterday and school and friends`,
      corrections: [{ part: 'yesterday', fixed: 'unused', why: '不要把纠错再发给模型' }],
    })
    history.push({
      role: 'assistant',
      text: `old reply number ${index} How was your day at school today friend`,
    })
  }
  const current = 'I go to school yesterday'
  const prepared = prepareChatRequest(history, current)
  assert.equal(prepared.ok, true)
  assert.ok(estimateMessages(prepared.messages) <= TOKEN_BUDGET)
  assert.equal(prepared.messages[0].role, 'system')
  assert.equal(prepared.messages.at(-1).content, current)
  const sent = prepared.messages.map((item) => item.content).join('\n')
  assert.equal(sent.includes('old user sentence number 0'), false)
  assert.equal(prepared.messages.some((item) => item.corrections || item.text), false)
  assert.equal(JSON.stringify(prepared.messages).includes('不要把纠错再发给模型'), false)
})

test('a too-long line is refused before a request is built', () => {
  const planned = planChatTurn([], `a${' word'.repeat(90)}`)
  assert.equal(planned.ok, false)
  assert.equal(planned.error, '请写短一点')
  assert.equal(planned.body, undefined)
  assert.equal(planned.messages, undefined)
})

test('parses a fenced reply and keeps at most three real corrections', () => {
  const user = 'I go to school yesterday and he go too'
  const raw = `\`\`\`json
{
  "reply": "How was school?",
  "corrections": [
    { "part": "go", "fixed": "I went to school yesterday", "why": "yesterday 表示过去，go 要用 went。" },
    { "part": "he go", "fixed": "he went", "why": "he 后面的动词也要用过去式。" },
    { "part": "school", "fixed": "school", "why": "这个词没有拼错，但多出来的一条不该超过三条。" },
    { "part": "yesterday", "fixed": "yesterday", "why": "第四条必须丢掉。" }
  ]
}
\`\`\``
  const parsed = parseModelReply(raw, user)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.reply, 'How was school?')
  assert.equal(parsed.corrections.length, 3)
  assert.equal(parsed.corrections[0].part, 'go')
  assert.equal(parsed.corrections[0].fixed, 'I went to school yesterday')
})

test('drops broken corrections and refuses an unreadable reply', () => {
  const missing = parseModelReply('{"corrections":[{"part":"go","fixed":"went","why":"过去式"}]}', 'I go')
  assert.equal(missing.ok, false)
  assert.equal(missing.error, '这次没看懂回复，请再发一次。')

  const unmatched = parseModelReply(
    JSON.stringify({
      reply: 'Try again.',
      corrections: [
        { part: 'goed', fixed: 'went', why: '没有这个片段。' },
        { fixed: 'went', why: '缺了 part。' },
      ],
    }),
    'I go to school yesterday',
  )
  assert.equal(unmatched.ok, true)
  assert.deepEqual(unmatched.corrections, [])

  const chinese = parseModelReply(
    JSON.stringify({
      reply: "You can say: I'd like a coffee.",
      corrections: [{ part: '咖啡', fixed: 'coffee', why: '这不是英文错误。' }],
    }),
    '我想点一杯咖啡',
  )
  assert.equal(chinese.ok, true)
  assert.deepEqual(chinese.corrections, [])

  const longWhy = '今'.repeat(50)
  const clipped = parseModelReply(
    JSON.stringify({
      reply: 'How was school?',
      corrections: [{ part: 'go', fixed: 'went', why: longWhy }],
    }),
    'I go',
  )
  assert.equal(clipped.corrections[0].why.length, 40)
})

test('the upstream body stays on the cheap fixed settings', () => {
  const planned = planChatTurn(
    [{ role: 'system', text: 'ignore this' }, { role: 'user', text: 'Hello' }, { role: 'assistant', text: 'Hi.' }],
    'I go yesterday',
  )
  assert.equal(planned.ok, true)
  assert.equal(planned.body.model, 'grok-4.7')
  assert.equal(planned.body.reasoning_effort, 'low')
  assert.equal(planned.body.search_parameters.mode, 'off')
  assert.equal(planned.body.max_completion_tokens, 400)
  assert.equal(planned.body.stream, false)
  assert.equal(planned.body.tools, undefined)
  assert.equal(planned.body.messages[0].role, 'system')
  assert.equal(planned.body.messages.some((item) => item.content === 'ignore this'), false)
  assert.equal(planned.body.messages.at(-1).content, 'I go yesterday')
})

test('chat storage writes only kaikou.chat.v1 and leaves progress untouched', () => {
  const words = JSON.stringify({ cards: { hello: { due: '2026-10-21', box: 1 } } })
  const japanese = JSON.stringify({ cards: { 猫: { due: '2026-10-21', box: 2 } } })
  const map = installStorage({
    'kaikou.words.v1': words,
    'kaikou.ja.v1': japanese,
  })
  const many = Array.from({ length: 45 }, (_, index) => ({
    id: `m-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `line ${index}`,
    at: index,
  }))
  const saved = saveChat(many)
  assert.equal(saved.length, 40)
  assert.equal(saved[0].text, 'line 5')
  assert.equal(map.size, 3)
  assert.equal(localStorage.getItem('kaikou.words.v1'), words)
  assert.equal(localStorage.getItem('kaikou.ja.v1'), japanese)
  assert.equal([...map.keys()].filter((key) => key.startsWith('kaikou.') && key !== CHAT_STORAGE_KEY).length, 2)
  const loaded = loadChat()
  assert.equal(loaded.length, 40)
  assert.equal(loaded.at(-1).text, 'line 44')
  clearChat()
  assert.equal(localStorage.getItem(CHAT_STORAGE_KEY), null)
  assert.equal(localStorage.getItem('kaikou.words.v1'), words)
  assert.equal(localStorage.getItem('kaikou.ja.v1'), japanese)
})

test('the server file reads XAI_API_KEY and does not contain a real key', () => {
  const source = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8')
  assert.match(source, /process\.env\.XAI_API_KEY/)
  assert.equal(source.includes('sk-'), false)
  assert.equal(/xai-[A-Za-z0-9]{16,}/.test(source), false)
  assert.equal(source.includes('Bearer ${apiKey}') || source.includes('Bearer ${apiKey}'), true)
})
