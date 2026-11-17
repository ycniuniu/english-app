const DIGIT = {
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
}

export function normalizeDigits(value) {
  return String(value || '').replace(/[０-９]/g, (char) => DIGIT[char] || char).trim()
}

function lineText(line) {
  return line.items.map((item) => item.text).join('')
}

export function clusterPdfLines(items, tolerance = 2.5) {
  const sorted = items
    .filter((item) => item && String(item.text || '').trim())
    .slice()
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x)
  const lines = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && last.page === item.page && Math.abs(last.y - item.y) <= tolerance) last.items.push(item)
    else lines.push({ page: item.page, y: item.y, items: [item] })
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return lines
}

function sectionKind(text) {
  if (text.includes('聴')) return { id: 'listening', label: '聴解' }
  if (text.includes('法') || text.includes('読')) return { id: 'grammar-reading', label: '文法・読解' }
  if (text.includes('彙') || text.includes('字')) return { id: 'vocabulary', label: '文字・語彙' }
  return null
}

function answerOf(text) {
  const value = normalizeDigits(text)
  return /^[1-4]$/.test(value) ? value : ''
}

function numberOf(text) {
  const value = normalizeDigits(text)
  return /^\d{1,3}$/.test(value) ? Number(value) : null
}

function isExample(text) {
  return text.includes('例')
}

function pairRow(numberItems, answerItems, section, mondai, unpaired) {
  const used = new Set()
  const paired = []
  for (const numberItem of numberItems) {
    if (isExample(numberItem.text)) continue
    const no = numberOf(numberItem.text)
    if (no == null) continue
    let best = null
    let bestGap = 18
    answerItems.forEach((answerItem, index) => {
      if (used.has(index)) return
      const gap = Math.abs(answerItem.x - numberItem.x)
      if (gap < bestGap) {
        best = index
        bestGap = gap
      }
    })
    if (best == null) {
      unpaired.push({ section: section.id, mondai, no, page: numberItem.page })
      continue
    }
    used.add(best)
    paired.push({
      id: `${section.id}:${mondai}:${no}`,
      section: section.id,
      sectionLabel: section.label,
      mondai,
      no,
      answer: answerOf(answerItems[best].text),
      choices: ['1', '2', '3', '4'],
      skill: section.id === 'listening' ? 'listening' : 'language',
      page: numberItem.page,
      explanation: '',
      example: false,
    })
  }
  return paired.filter((item) => item.answer)
}

export function pairJlptAnswerSheet(items) {
  const lines = clusterPdfLines(items)
  const sections = []
  let section = null
  let pending = null
  const unpaired = []
  const scored = []

  function takePending(answerLine) {
    if (!pending || !section) return
    const answers = answerLine.items.filter((item) => answerOf(item.text))
    if (!answers.length) return
    scored.push(...pairRow(pending.numbers, answers, section, pending.mondai, unpaired))
    pending = null
  }

  for (const line of lines) {
    const text = lineText(line)
    if (!text.trim() || /^[\sぁ-ん・ー]+$/.test(text)) continue
    if (text.includes('正答表') && !text.includes('問題') && !text.includes('●')) continue
    const kind = text.includes('●') ? sectionKind(text) : null
    if (kind) {
      section = kind
      if (!sections.some((item) => item.id === kind.id)) sections.push({ ...kind, count: 0 })
      pending = null
      continue
    }
    if (text.includes('問題')) {
      const label = line.items.find((item) => String(item.text).includes('問題'))
      const matched = normalizeDigits(label?.text || '').match(/問題\s*(\d+)/)
      const mondai = matched ? Number(matched[1]) : pending?.mondai || 0
      const numbers = line.items.filter((item) => !String(item.text).includes('問題') && (isExample(item.text) || numberOf(item.text) != null))
      pending = { mondai, numbers }
      continue
    }
    const onlyNumbers = line.items.every((item) => isExample(item.text) || numberOf(item.text) != null)
    const onlyAnswers = line.items.every((item) => answerOf(item.text))
    if (pending && onlyAnswers) {
      takePending(line)
      continue
    }
    if (onlyNumbers && line.items.some((item) => numberOf(item.text) != null)) {
      pending = { mondai: pending?.mondai || 0, numbers: line.items }
    }
  }

  const seen = new Set()
  const itemsOut = []
  for (const item of scored) {
    if (!item.answer || seen.has(item.id)) {
      unpaired.push({ section: item.section, mondai: item.mondai, no: item.no, page: item.page, duplicate: seen.has(item.id) })
      continue
    }
    seen.add(item.id)
    itemsOut.push(item)
  }
  for (const group of sections) group.count = itemsOut.filter((item) => item.section === group.id).length
  if (!itemsOut.length) {
    return { ok: false, error: '这份 PDF 没配出题号和答案。没有写入。请换官方正答表，或改用校验过的 JSON。' }
  }
  return { ok: true, mode: 'pdf-answer-sheet', sections, items: itemsOut, unpaired }
}

export function parseOfficialKey(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'JSON 不是对象。没有写入。' }
  if (value.format !== 'kaikou-official-key' || value.version !== 1) return { ok: false, error: '不是开口能校验的官方资料 JSON。没有写入。' }
  const exam = value.exam
  if (exam !== 'jlpt' && exam !== 'ielts' && exam !== 'toefl') return { ok: false, error: '考试只能是 jlpt、ielts 或 toefl。没有写入。' }
  if (!Array.isArray(value.items) || !value.items.length) return { ok: false, error: 'JSON 里没有题目。没有写入。' }
  const items = []
  const seen = new Set()
  for (const raw of value.items) {
    if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) return { ok: false, error: '有题目缺少编号。整份没有写入。' }
    if (seen.has(raw.id)) return { ok: false, error: `题目 ${raw.id} 重复。整份没有写入。` }
    seen.add(raw.id)
    const skill = typeof raw.skill === 'string' ? raw.skill : 'reading'
    const constructed = skill === 'writing' || skill === 'speaking'
    const choices = Array.isArray(raw.choices) ? raw.choices.map((choice) => String(choice)) : []
    if (!constructed && !choices.length) return { ok: false, error: `题目 ${raw.id} 没有选项。整份没有写入。` }
    const answer = raw.answer == null ? '' : String(raw.answer)
    if (!constructed && answer && !choices.includes(answer)) return { ok: false, error: `题目 ${raw.id} 的答案不在选项里。整份没有写入。` }
    items.push({
      id: raw.id,
      stem: typeof raw.stem === 'string' ? raw.stem : '',
      section: typeof raw.section === 'string' ? raw.section : skill,
      sectionLabel: typeof raw.sectionLabel === 'string' ? raw.sectionLabel : (typeof raw.section === 'string' ? raw.section : skill),
      no: raw.no == null ? raw.id : raw.no,
      answer,
      choices,
      skill,
      page: Number.isInteger(raw.page) ? raw.page : null,
      explanation: typeof raw.explanation === 'string' ? raw.explanation : '',
      reference: typeof raw.reference === 'string' ? raw.reference : '',
      constructed,
    })
  }
  const source = value.source && typeof value.source === 'object' ? value.source : {}
  return {
    ok: true,
    mode: 'json-key',
    exam,
    source,
    items,
    sections: summarizeSections(items),
    unpaired: [],
  }
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const source = String(text || '').replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (char !== '\r') cell += char
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((line) => line.some((item) => item.trim()))
}

export function parseOfficialCsv(text) {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return { ok: false, error: 'CSV 至少要有表头和一行题目。没有写入。' }
  const header = rows[0].map((item) => item.trim())
  const column = (name) => header.indexOf(name)
  if (column('exam') < 0 || column('id') < 0) return { ok: false, error: 'CSV 表头必须有 exam 和 id。没有写入。' }
  const items = []
  let exam = ''
  for (const line of rows.slice(1)) {
    const read = (name) => {
      const index = column(name)
      return index < 0 ? '' : String(line[index] || '').trim()
    }
    const rowExam = read('exam')
    if (!exam) exam = rowExam
    if (rowExam && rowExam !== exam) return { ok: false, error: '一份 CSV 只能包含一种考试。没有写入。' }
    const choices = ['choice1', 'choice2', 'choice3', 'choice4'].map(read).filter(Boolean)
    const page = Number(read('page'))
    items.push({
      id: read('id'),
      stem: read('stem'),
      section: read('section') || read('skill') || 'reading',
      sectionLabel: read('section') || read('skill') || 'reading',
      skill: read('skill') || 'reading',
      choices,
      answer: read('answer'),
      explanation: read('explanation'),
      reference: read('reference'),
      page: Number.isInteger(page) && page > 0 ? page : undefined,
    })
  }
  return parseOfficialKey({
    format: 'kaikou-official-key',
    version: 1,
    exam,
    source: { title: 'CSV 导入', level: '', edition: 'csv' },
    items,
  })
}

export function summarizeSections(items) {
  const map = new Map()
  for (const item of items) {
    const key = item.section || 'other'
    if (!map.has(key)) map.set(key, { id: key, label: item.sectionLabel || key, count: 0 })
    map.get(key).count += 1
  }
  return [...map.values()]
}

export async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
