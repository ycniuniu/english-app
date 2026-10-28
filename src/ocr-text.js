export function pointOf(point) {
  if (Array.isArray(point) && point.length >= 2) {
    const x = Number(point[0])
    const y = Number(point[1])
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  if (point && typeof point === 'object') {
    const x = Number(point.x)
    const y = Number(point.y)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return null
}

function boxOf(item) {
  const poly = item?.poly || item?.points || []
  const pts = (Array.isArray(poly) ? poly : []).map(pointOf).filter(Boolean)
  const text = String(item?.text ?? '').trim()
  if (!pts.length || !text) return null
  const xs = pts.map((point) => point.x)
  const ys = pts.map((point) => point.y)
  return {
    text,
    score: Number(item?.score ?? 1),
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  }
}

function sameLine(box, group) {
  const boxHeight = Math.max(1, box.bottom - box.top)
  const groupHeight = Math.max(1, group.bottom - group.top)
  const mid = (box.top + box.bottom) / 2
  const groupMid = (group.top + group.bottom) / 2
  return Math.abs(mid - groupMid) <= Math.min(boxHeight, groupHeight) * 0.6
}

function joinParts(parts) {
  const texts = parts.map((part) => part.text)
  const joined = texts.join('')
  const latin = (joined.match(/[A-Za-z]/g) || []).length
  const cjk = (joined.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length
  if (latin > cjk) return texts.join(' ').replace(/\s+/g, ' ').trim()
  return texts.join('').replace(/\s+/g, '').trim()
}

export function linesFromOcrItems(items, { minScore = 0.2 } = {}) {
  const boxes = (Array.isArray(items) ? items : [])
    .map(boxOf)
    .filter((box) => box && box.score >= minScore)
    .sort((a, b) => a.top - b.top || a.left - b.left)

  const groups = []
  for (const box of boxes) {
    const group = groups.find((candidate) => sameLine(box, candidate))
    if (group) {
      group.parts.push(box)
      group.top = Math.min(group.top, box.top)
      group.bottom = Math.max(group.bottom, box.bottom)
    } else {
      groups.push({ top: box.top, bottom: box.bottom, parts: [box] })
    }
  }

  return groups
    .sort((a, b) => a.top - b.top)
    .map((group) => joinParts(group.parts.sort((a, b) => a.left - b.left)))
    .filter(Boolean)
}

const KANA = /[\u3040-\u30ff\u31f0-\u31ff\uff66-\uff9d]/

export function photoScript(text) {
  const value = String(text ?? '')
  if (KANA.test(value)) return 'ja'
  const cjk = (value.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (value.match(/[A-Za-z]/g) || []).length
  if (latin > cjk) return 'en'
  if (cjk > 0) return 'ja'
  return 'en'
}

export function photoTranslationDirection(text) {
  const script = photoScript(text)
  if (script === 'ja') {
    return { from: 'ja', to: 'zh-CN', english: false, label: '日文 → 中文', script: 'ja' }
  }
  return { from: 'en', to: 'zh-CN', english: false, label: '英文 → 中文', script: 'en' }
}

export function photoProgressStatus(progress) {
  const phase = progress?.phase
  if (phase === 'download') {
    const label = String(progress.label || '').trim()
    return label ? `正在下载识别模型… ${label}` : '正在下载识别模型…'
  }
  if (phase === 'prepare') return '正在加载识别组件…'
  if (phase === 'recognize') return '正在识别文字…'
  if (phase === 'translate') return '正在逐行翻译…'
  return '正在准备识别…'
}

export function ocrFailureMessage(error) {
  if (error?.name === 'AbortError') return ''
  const message = String(error?.message || '')
  if (/file:|HTTP\(S\) origin/i.test(message)) return '请用浏览器打开页面后再拍照。'
  if (/download|Failed to fetch|NetworkError|network|Load failed|HTTP \d+/i.test(message)) {
    return '识别模型没有下载下来，请联网后再试。'
  }
  if (error?.name === 'RangeError' || /out of memory|allocate memory|Maximum memory/i.test(message)) {
    return '这台手机内存不够，识别停了。请关掉别的页面后再试。'
  }
  if (/SIMD/i.test(message)) return '这台浏览器不支持识别所需的指令。'
  if (/shared memory|crossOriginIsolated|SharedArrayBuffer/i.test(message)) {
    return '这台浏览器开不了识别组件。请用系统自带的浏览器打开后再试。'
  }
  if (/inference\.(onnx|yml)|tar archive|model_name/i.test(message)) {
    return '识别模型文件不完整，请刷新页面后再试。'
  }
  if (/timed out|timeout/i.test(message)) return '识别超时了，请换一张更小的照片。'
  return '这张照片没有识别成，请换一张更清晰的。'
}
