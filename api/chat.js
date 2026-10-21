import { ENDPOINT, planChatTurn, parseModelReply } from '../src/chat-prompt.js'

export const maxDuration = 30

const MAX_BODY_BYTES = 8 * 1024
const MAX_PER_MINUTE = 10
const WINDOW_MS = 60 * 1000
const hits = new Map()

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function header(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function sameOrigin(req) {
  const origin = header(req, 'origin')
  const host = String(header(req, 'x-forwarded-host') || header(req, 'host') || '')
    .split(',')[0]
    .trim()
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function clientIp(req) {
  const forwarded = header(req, 'x-forwarded-for')
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function allowRequest(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= MAX_PER_MINUTE) {
    hits.set(ip, recent)
    return false
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(key)
    }
  }
  return true
}

async function readPayload(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_BODY_BYTES) {
      const error = new Error('too-big')
      error.code = 'TOO_BIG'
      throw error
    }
    return req.body
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > MAX_BODY_BYTES) {
      const error = new Error('too-big')
      error.code = 'TOO_BIG'
      throw error
    }
    chunks.push(buf)
  }
  if (!size) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('bad-json')
    error.code = 'BAD_JSON'
    throw error
  }
}

function quotaError(status) {
  return status === 402 || status === 429
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: '请用发送按钮再试一次。' })
    return
  }
  if (!sameOrigin(req)) {
    sendJson(res, 403, { error: '请从开口页面发送。' })
    return
  }

  const declared = Number(header(req, 'content-length') || 0)
  if (declared > MAX_BODY_BYTES) {
    sendJson(res, 413, { error: '请写短一点' })
    return
  }

  let payload
  try {
    payload = await readPayload(req)
  } catch (error) {
    if (error?.code === 'TOO_BIG') {
      sendJson(res, 413, { error: '请写短一点' })
      return
    }
    sendJson(res, 400, { error: '发送没有成功，请再试一次。' })
    return
  }

  const planned = planChatTurn(payload?.messages, payload?.text)
  if (!planned.ok) {
    sendJson(res, 400, { error: planned.error })
    return
  }

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    sendJson(res, 503, { error: '还没有配置对话密钥。请在 Vercel 的环境变量里添加 XAI_API_KEY。' })
    return
  }
  if (!allowRequest(clientIp(req))) {
    sendJson(res, 429, { error: '发得太快了，请稍后再试。' })
    return
  }

  let upstream
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(planned.body),
      signal: AbortSignal.timeout(25000),
    })
  } catch {
    sendJson(res, 502, { error: '这次没连上，请再试一次。' })
    return
  }

  if (quotaError(upstream.status)) {
    sendJson(res, 429, { error: '今天的对话额度用完了。' })
    return
  }
  if (!upstream.ok) {
    sendJson(res, 502, { error: '这次没连上，请再试一次。' })
    return
  }

  let data
  try {
    data = await upstream.json()
  } catch {
    sendJson(res, 502, { error: '这次没看懂回复，请再发一次。' })
    return
  }

  const parsed = parseModelReply(data?.choices?.[0]?.message?.content, payload?.text)
  if (!parsed.ok) {
    sendJson(res, 502, { error: parsed.error })
    return
  }
  sendJson(res, 200, { reply: parsed.reply, corrections: parsed.corrections })
}
