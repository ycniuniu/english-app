// Placeholder contract for a future WeChat mini program.
// The web app does not call this. The mini program cannot ship the model,
// so a server would run the same recognizer and return bilingual lines.
export const MINIAPP_OCR_PATH = '/api/photo-translate'

export function buildMiniappOcrRequest({ imageBase64, mime } = {}) {
  const raw = String(imageBase64 ?? '').trim()
  const dataUrl = raw.match(/^data:([^;]+);base64,(.+)$/)
  const request = {
    imageBase64: dataUrl ? dataUrl[2] : raw,
    mime: mime || (dataUrl ? dataUrl[1] : 'image/jpeg'),
  }
  if (!request.imageBase64) return { ok: false, error: '缺少照片' }
  return { ok: true, request }
}

export function parseMiniappOcrResponse(payload) {
  if (!payload || payload.ok === false) {
    return { ok: false, error: payload?.error || '识别失败', rows: [] }
  }
  const lines = Array.isArray(payload.lines) ? payload.lines : []
  const rows = []
  for (const line of lines) {
    const source = String(line?.source ?? '').trim()
    const zh = String(line?.zh ?? '').trim()
    if (!source || !zh) continue
    rows.push({ source, zh })
  }
  if (!rows.length) return { ok: false, error: '没有识别到文字', rows: [] }
  return { ok: true, rows }
}

export function mockMiniappOcr(body) {
  const built = buildMiniappOcrRequest(body || {})
  if (!built.ok) return { ok: false, error: built.error, lines: [] }
  return {
    ok: true,
    lines: [
      { source: 'Hello', zh: '你好' },
      { source: '駅', zh: '车站' },
    ],
  }
}
