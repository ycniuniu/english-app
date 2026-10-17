const BROAD_POS = {
  及物动词: '动词',
  不及物动词: '动词',
  动词: '动词',
  助动词: '动词',
  情态动词: '动词',
  名词: '名词',
  形容词: '形容词',
  副词: '副词',
  介词: '介词',
  连词: '连词',
  代词: '代词',
  数词: '数词',
  感叹词: '感叹词',
  冠词: '冠词',
  限定词: '限定词',
  缩写: '缩写',
  其他: '其他',
}

const VERB_SLOTS = ['原形', '过去式', '过去分词', '现在分词']
const ADJECTIVE_SLOTS = ['原形', '比较级', '最高级']
const NOUN_SLOTS = ['原形', '复数']

const FUNCTION_WORDS = new Set(
  `a an the of to in on at for and or but if as by with from into onto than that this these those
  it its be is am are was were been being do does did have has had will would can could may might
  shall should must not no nor so too very just also there here then when where what which who whom
  whose how why she he her his him they them their we our us you your i my me please every all both
  each few more most some any such own about over after before between through during without within
  again once only even still already always never often back out off down up one's`
    .split(/\s+/)
    .filter(Boolean),
)

export function broadPos(label) {
  return BROAD_POS[label] || label || '其他'
}

export function wordPosLabels(senses) {
  const labels = []
  for (const sense of senses || []) {
    const label = broadPos(sense.pos)
    if (label && !labels.includes(label)) labels.push(label)
  }
  const concrete = labels.filter((label) => label !== '其他')
  return concrete.length ? concrete : labels
}

export function recallGlosses(senses, headZh = '') {
  const list = []
  for (const sense of senses || []) {
    const zh = String(sense?.zh || '').trim()
    if (!zh) continue
    list.push({ pos: sense.pos || '', zh })
  }
  const head = String(headZh || '').trim()
  if (head && !list.some((item) => item.zh === head)) list.unshift({ pos: list[0]?.pos || '', zh: head })
  return list
}

export function glossPosVaries(senses) {
  const labels = []
  for (const sense of senses || []) {
    const label = broadPos(sense.pos)
    if (label && !labels.includes(label)) labels.push(label)
  }
  return labels.length > 1
}

function pushForm(items, name, pos, word) {
  const text = String(word || '').trim()
  if (!text || text === '—') return
  items.push({ label: `${name}（${pos}）`, word: text })
}

export function describeForms(lines, senses, headword = '') {
  const items = []
  const families = wordPosLabels(senses)
  for (const line of lines || []) {
    const text = String(line || '').trim()
    if (!text) continue
    if (text.includes('无词形变化')) {
      const stated = text.split(/[，,]/)[0].replace('无词形变化', '').trim()
      const pos = stated ? broadPos(stated) : families.join('、')
      items.push({ label: pos ? `无词形变化（${pos}）` : '无词形变化', word: '' })
      continue
    }
    if (text === '本身常作最高级') {
      pushForm(items, '最高级', '形容词', headword)
      continue
    }
    if (text.startsWith('复数 ')) {
      const pos = families.includes('名词') ? '名词' : families[0] || '名词'
      pushForm(items, '复数', pos, text.slice('复数 '.length))
      continue
    }
    const match = text.match(/^(动词|名词|形容词|副词|数词|代词)\s+(.+)$/)
    if (!match) {
      pushForm(items, '词形', families[0] || '其他', text)
      continue
    }
    const pos = match[1]
    const parts = match[2].split(' / ')
    const names = pos === '动词' ? VERB_SLOTS : pos === '形容词' ? ADJECTIVE_SLOTS : pos === '名词' ? NOUN_SLOTS : null
    parts.forEach((part, index) => {
      pushForm(items, names?.[index] || '词形', pos, part)
    })
  }
  return items
}

export function speakableParts(text) {
  const parts = []
  const pattern = /[A-Za-z]+(?:['’][A-Za-z]+)?|[^A-Za-z]+/g
  for (const token of String(text || '').match(pattern) || []) {
    if (!/^[A-Za-z]/.test(token)) {
      parts.push({ text: token, speak: '', clickable: false })
      continue
    }
    const speak = token.replaceAll('’', "'")
    const key = speak.toLowerCase()
    parts.push({ text: token, speak, clickable: !FUNCTION_WORDS.has(key) })
  }
  return parts
}
