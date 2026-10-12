const SMALL_KANA = new Set([...'ャュョァィゥェォヮ'])
const GODAN = {
  う: { i: 'い', e: 'え', te: 'って', ta: 'った' },
  く: { i: 'き', e: 'け', te: 'いて', ta: 'いた' },
  ぐ: { i: 'ぎ', e: 'げ', te: 'いで', ta: 'いだ' },
  す: { i: 'し', e: 'せ', te: 'して', ta: 'した' },
  つ: { i: 'ち', e: 'て', te: 'って', ta: 'った' },
  ぬ: { i: 'に', e: 'ね', te: 'んで', ta: 'んだ' },
  ぶ: { i: 'び', e: 'べ', te: 'んで', ta: 'んだ' },
  む: { i: 'み', e: 'め', te: 'んで', ta: 'んだ' },
  る: { i: 'り', e: 'れ', te: 'って', ta: 'った' },
}

const POS_LABEL = [
  ['动词', (tags) => verbClass(tags) != null],
  ['形容词', (tags) => tags.some((tag) => tag === 'adj-i' || tag === 'adj-na' || tag === 'adj-no' || tag === 'adj-ix')],
  ['名词', (tags) => tags.some((tag) => tag === 'n' || tag.startsWith('n-'))],
  ['副词', (tags) => tags.some((tag) => tag === 'adv' || tag.startsWith('adv-'))],
  ['代词', (tags) => tags.includes('pn')],
  ['连词', (tags) => tags.includes('conj')],
  ['助词', (tags) => tags.includes('prt')],
  ['感叹词', (tags) => tags.includes('int')],
  ['量词', (tags) => tags.includes('ctr')],
  ['表达', (tags) => tags.includes('exp')],
]

export function verbClass(tags) {
  const list = tags || []
  if (list.includes('vk')) return 'kuru'
  if (list.includes('vz')) return 'zuru'
  if (list.some((tag) => tag === 'vs' || tag.startsWith('vs-'))) return 'suru'
  if (list.some((tag) => tag.startsWith('v5'))) return 'godan'
  if (list.includes('v1') || list.includes('v1-s')) return 'ichidan'
  return null
}

export function posLabels(tags) {
  const labels = []
  for (const [label, test] of POS_LABEL) {
    if (test(tags || []) && !labels.includes(label)) labels.push(label)
  }
  return labels.length ? labels : ['其他']
}

export function isKatakanaWord(word) {
  const text = String(word || '').normalize('NFKC')
  let kana = false
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code >= 0x4e00 && code <= 0x9fff) return false
    if (code >= 0x3040 && code <= 0x309f) return false
    if ((code >= 0x30a0 && code <= 0x30ff) || ch === 'ー') kana = true
  }
  return kana
}

export function splitKatakana(word) {
  const text = String(word || '').normalize('NFKC')
  const parts = []
  let buf = ''
  let soku = ''
  const push = () => {
    if (!buf) return
    parts.push(buf)
    buf = ''
  }
  for (const ch of text) {
    if (/[A-Za-z0-9]/.test(ch)) {
      if (buf && !/[A-Za-z0-9]/.test(buf)) push()
      buf += ch
      continue
    }
    if (ch === 'ッ') {
      push()
      soku = 'ッ'
      continue
    }
    if (SMALL_KANA.has(ch) || ch === 'ー') {
      buf += ch
      continue
    }
    if (ch === 'ン') {
      buf += 'ン'
      parts.push(soku + buf)
      soku = ''
      buf = ''
      continue
    }
    if (ch === '・' || ch === '･') {
      push()
      continue
    }
    const code = ch.codePointAt(0)
    if (code >= 0x30a1 && code <= 0x30f6) {
      push()
      buf = soku + ch
      soku = ''
      continue
    }
  }
  if (buf) parts.push(soku + buf)
  else if (soku) parts.push(soku)
  return parts.filter(Boolean)
}

function replaceTail(word, reading, cut, ending) {
  const cutText = reading.slice(reading.length - cut)
  const stemWord = word.endsWith(cutText) ? word.slice(0, word.length - cut) : word
  return {
    word: stemWord + ending,
    reading: reading.slice(0, reading.length - cut) + ending,
  }
}

function shaped(key, name, built, quiz) {
  return { key, name, word: built.word, reading: built.reading, quiz }
}

function godanRow(reading, tags, word) {
  const end = reading.slice(-1)
  const row = GODAN[end]
  if (!row) return null
  const specialIku = end === 'く' && (tags.includes('v5k-s') || reading === 'いく' || reading === 'ゆく' || word === '行く')
  const specialU = end === 'う' && tags.includes('v5u-s')
  return {
    ...row,
    te: specialIku ? 'って' : specialU ? 'うて' : row.te,
    ta: specialIku ? 'った' : specialU ? 'うた' : row.ta,
  }
}

export function conjugate(word, reading, tags) {
  const list = tags || []
  const text = String(word || '')
  const read = String(reading || '')
  const klass = verbClass(list)

  if (klass === 'ichidan' && read.endsWith('る')) {
    return [
      shaped('masu', 'ます形', replaceTail(text, read, 1, 'ます'), true),
      shaped('te', 'て形', replaceTail(text, read, 1, 'て'), true),
      shaped('ta', 'た形', replaceTail(text, read, 1, 'た'), true),
      shaped('pot', '可能形', replaceTail(text, read, 1, 'られる'), true),
    ]
  }
  if (klass === 'godan') {
    const row = godanRow(read, list, text)
    if (!row) return []
    return [
      shaped('masu', 'ます形', replaceTail(text, read, 1, `${row.i}ます`), true),
      shaped('te', 'て形', replaceTail(text, read, 1, row.te), true),
      shaped('ta', 'た形', replaceTail(text, read, 1, row.ta), true),
      shaped('pot', '可能形', replaceTail(text, read, 1, `${row.e}る`), true),
    ]
  }
  if (klass === 'kuru' && read.endsWith('くる')) {
    const kana = !text.includes('来')
    const stemWord = text.endsWith('来る') || text.endsWith('くる') ? text.slice(0, -2) : text
    const stem = read.slice(0, -2)
    const write = (kanjiEnding, kanaEnding) => ({
      word: `${stemWord}${kana ? kanaEnding : kanjiEnding}`,
      reading: `${stem}${kanaEnding}`,
    })
    return [
      shaped('masu', 'ます形', write('来ます', 'きます'), true),
      shaped('te', 'て形', write('来て', 'きて'), true),
      shaped('ta', 'た形', write('来た', 'きた'), true),
      shaped('pot', '可能形', write('来られる', 'こられる'), true),
    ]
  }
  if (klass === 'suru' && read.endsWith('する')) {
    if (read === 'する') {
      return [
        shaped('masu', 'ます形', { word: 'します', reading: 'します' }, true),
        shaped('te', 'て形', { word: 'して', reading: 'して' }, true),
        shaped('ta', 'た形', { word: 'した', reading: 'した' }, true),
        shaped('pot', '可能形', { word: 'できる', reading: 'できる' }, true),
      ]
    }
    const stemWord = text.endsWith('する') ? text.slice(0, -2) : text
    const stem = read.slice(0, -2)
    return [
      shaped('masu', 'ます形', { word: `${stemWord}します`, reading: `${stem}します` }, true),
      shaped('te', 'て形', { word: `${stemWord}して`, reading: `${stem}して` }, true),
      shaped('ta', 'た形', { word: `${stemWord}した`, reading: `${stem}した` }, true),
      shaped('pot', '可能形', { word: `${stemWord}できる`, reading: `${stem}できる` }, true),
    ]
  }
  if (klass === 'zuru' && read.endsWith('ずる')) {
    return [
      shaped('masu', 'ます形', replaceTail(text, read, 2, 'じます'), true),
      shaped('te', 'て形', replaceTail(text, read, 2, 'じて'), true),
      shaped('ta', 'た形', replaceTail(text, read, 2, 'じた'), true),
      shaped('pot', '可能形', replaceTail(text, read, 2, 'じられる'), true),
    ]
  }
  if (list.includes('adj-ix') || read === 'いい') {
    const kanji = text.includes('良')
    return [
      shaped('neg', '否定形', { word: kanji ? '良くない' : 'よくない', reading: 'よくない' }, false),
      shaped('past', '过去形', { word: kanji ? '良かった' : 'よかった', reading: 'よかった' }, false),
    ]
  }
  if (list.includes('adj-i') && read.endsWith('い')) {
    return [
      shaped('neg', '否定形', replaceTail(text, read, 1, 'くない'), false),
      shaped('past', '过去形', replaceTail(text, read, 1, 'かった'), false),
    ]
  }
  if (list.includes('adj-na')) {
    return [
      shaped('neg', '否定形', { word: `${text}じゃない`, reading: `${read}じゃない` }, false),
      shaped('past', '过去形', { word: `${text}だった`, reading: `${read}だった` }, false),
    ]
  }
  return []
}
