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

const VERB_LABELS = ['base', 'past', 'past participle', '-ing']
const VERB_SLOTS = ['base', 'past', 'pp', 'ing']
const ADJECTIVE_SLOTS = ['原形', '比较级', '最高级']
const NOUN_SLOTS = ['原形', '复数']

const STATIVE_VERBS = new Set([
  'believe',
  'belong',
  'consist',
  'contain',
  'cost',
  'deserve',
  'exist',
  'have',
  'hear',
  'include',
  'involve',
  'know',
  'lack',
  'like',
  'love',
  'matter',
  'mean',
  'mind',
  'need',
  'owe',
  'own',
  'possess',
  'prefer',
  'remember',
  'require',
  'resemble',
  'see',
  'seem',
  'suppose',
  'understand',
  'want',
  'wish',
])

const INTRANS_BASES = new Set([
  'appear',
  'arise',
  'arrive',
  'come',
  'die',
  'fall',
  'go',
  'happen',
  'lie',
  'live',
  'matter',
  'occur',
  'rise',
  'run',
  'sit',
  'ski',
  'sleep',
  'stand',
  'stay',
  'swim',
  'wait',
  'walk',
  'work',
])

const INTRANS_GLOSS = /^(来|来到|过来|去|走|工作|运转|发生|恰巧|死亡|死|消逝|坐|站|站立|跑|奔|游|躺|升起|上升|下降|倒下|居住|住|出现|睡觉|睡|等待|等|到达|抵达|开始|启动|离开|转弯|下雨|下雪|滑雪)/

function shortGloss(text) {
  const head = String(text || '')
    .split(/[（(，,；;]/)[0]
    .trim()
  return head || '做'
}

function verbSense(senses) {
  return (senses || []).find((sense) => String(sense.pos || '').includes('动词')) || null
}

function capWord(text) {
  const value = String(text || '')
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function examplePattern(base, gloss, senses) {
  const key = String(base || '').toLowerCase()
  const pos = String(verbSense(senses)?.pos || '')
  const intransPos = pos.includes('不及物')
  const transPos = pos.includes('及物') && !intransPos
  if (key === 'belong' || gloss.startsWith('属于')) return 'belong'
  if (key === 'consist' || /^(组成|存在于|一致)/.test(gloss)) return 'consist'
  if (key === 'cost' || gloss.startsWith('花费')) return 'cost'
  if (key === 'exist' || /^(存在|生存)/.test(gloss)) return 'exist'
  if (key === 'seem' || key === 'become' || key === 'remain') return 'link'
  if (/^(象是|似乎|好像|好象|显得|变成|变得)/.test(gloss)) return 'link'
  if (intransPos && /^(保持|逗留|仍然)/.test(gloss)) return 'link'
  const intrans = intransPos || INTRANS_BASES.has(key) || INTRANS_GLOSS.test(gloss)
  const stative = STATIVE_VERBS.has(key)
  if (intrans && (!transPos || INTRANS_BASES.has(key))) return stative ? 'stative-intrans' : 'intrans'
  return stative ? 'stative-obj' : 'obj'
}

function linkChinese(gloss, slot) {
  const meaning = /变成|变得/.test(gloss) ? '变得清楚' : /保持|逗留|仍然/.test(gloss) ? '保持清楚' : '看起来清楚'
  if (slot === 'past') return `事情昨天${meaning}。`
  if (slot === 'pp') return `事情以前${meaning}过。`
  if (slot === 'ing') return `${meaning}需要练习。`
  return `事情${meaning}。`
}

function exampleLine(pattern, form, slot, gloss) {
  const zh = gloss || '做'
  const cap = capWord(form)
  if (pattern === 'link') {
    if (slot === 'past') return [`Things ${form} clear yesterday.`, linkChinese(zh, slot)]
    if (slot === 'pp') return [`Things have ${form} clear before.`, linkChinese(zh, slot)]
    if (slot === 'ing') return [`${cap} clear takes practice.`, linkChinese(zh, slot)]
    return [`Things ${form} clear.`, linkChinese(zh, slot)]
  }
  if (pattern === 'belong') {
    if (slot === 'past') return [`They ${form} here yesterday.`, '他们昨天属于这里。']
    if (slot === 'pp') return [`They have ${form} here before.`, '他们以前属于这里。']
    if (slot === 'ing') return [`${cap} here matters.`, '属于这里很重要。']
    return [`They ${form} here.`, '他们属于这里。']
  }
  if (pattern === 'consist') {
    if (slot === 'past') return [`They ${form} of two parts yesterday.`, '它们昨天由两部分组成。']
    if (slot === 'pp') return [`They have ${form} of two parts before.`, '它们以前由两部分组成过。']
    if (slot === 'ing') return [`${cap} of two parts is common.`, '由两部分组成很常见。']
    return [`They ${form} of two parts.`, '它们由两部分组成。']
  }
  if (pattern === 'cost') {
    if (slot === 'past') return [`They ${form} money yesterday.`, '它们昨天要花钱。']
    if (slot === 'pp') return [`They have ${form} money before.`, '它们以前要花过钱。']
    if (slot === 'ing') return [`${cap} money is common.`, '花钱很常见。']
    return [`They ${form} money.`, '它们要花钱。']
  }
  if (pattern === 'exist') {
    if (slot === 'past') return [`They ${form} yesterday.`, '它们昨天存在。']
    if (slot === 'pp') return [`They have ${form} before.`, '它们以前存在过。']
    if (slot === 'ing') return [`${cap} takes time.`, '存在需要时间。']
    return [`They ${form}.`, '它们存在。']
  }
  const object = pattern === 'obj' || pattern === 'stative-obj'
  const stative = pattern === 'stative-obj' || pattern === 'stative-intrans'
  if (slot === 'past') {
    return object
      ? [`They ${form} it yesterday.`, `他们昨天${zh}了。`]
      : [`They ${form} yesterday.`, `他们昨天${zh}了。`]
  }
  if (slot === 'pp') {
    return object
      ? [`They have ${form} it before.`, `他们以前${zh}过。`]
      : [`They have ${form} before.`, `他们以前${zh}过。`]
  }
  if (slot === 'ing') {
    if (stative) {
      return object ? [`${cap} it helps.`, `${zh}会有帮助。`] : [`${cap} takes time.`, `${zh}需要时间。`]
    }
    return object
      ? [`They are ${form} it now.`, `他们现在正在${zh}。`]
      : [`They are ${form} now.`, `他们现在正在${zh}。`]
  }
  return object
    ? [`They ${form} it every day.`, `他们每天都${zh}。`]
    : [`They ${form} every day.`, `他们每天都${zh}。`]
}

const VERBAL_GLOSS = /(?:学习|结束|控制|服务|研究|改变|变化|使用|报告|经过|帮助|支持|决定|开始|工作|经历|开放|爱|跑|读|写|说|看|听|想|做|用|给|拿|放|让|来|去)$/

function displayGloss(senses) {
  const verb = verbSense(senses)
  if (verb?.zh) return shortGloss(verb.zh)
  const first = shortGloss(senses?.[0]?.zh)
  if (first && VERBAL_GLOSS.test(first)) return first
  return ''
}

const CUSTOM_EXAMPLES = {
  think(form, slot) {
    if (slot === 'past') return [`They ${form} about it yesterday.`, '他们昨天想过这件事。']
    if (slot === 'pp') return [`They have ${form} about it before.`, '他们以前想过这件事。']
    if (slot === 'ing') return [`They are ${form} about it now.`, '他们正在想这件事。']
    return [`They ${form} about it every day.`, '他们每天都想这件事。']
  },
  mean(form, slot) {
    if (slot === 'past') return [`They ${form} it yesterday.`, '他们昨天就是这个意思。']
    if (slot === 'pp') return [`They have ${form} it before.`, '他们以前就是这个意思。']
    if (slot === 'ing') return [`${capWord(form)} it takes care.`, '把意思说清楚需要用心。']
    return [`They ${form} it.`, '他们是这个意思。']
  },
  matter(form, slot) {
    if (slot === 'past') return [`These things ${form} yesterday.`, '这些事昨天很重要。']
    if (slot === 'pp') return [`These things have ${form} before.`, '这些事以前很重要。']
    if (slot === 'ing') return null
    return [`These things ${form}.`, '这些事很重要。']
  },
  let(form, slot) {
    if (slot === 'past') return [`They ${form} it go yesterday.`, '他们昨天放手了。']
    if (slot === 'pp') return [`They have ${form} it go before.`, '他们以前放手过。']
    if (slot === 'ing') return [`They are ${form} it go now.`, '他们正在放手。']
    return [`They ${form} it go.`, '他们放手。']
  },
  put(form, slot) {
    if (slot === 'past') return [`They ${form} it down yesterday.`, '他们昨天把它放下了。']
    if (slot === 'pp') return [`They have ${form} it down before.`, '他们以前把它放下过。']
    if (slot === 'ing') return [`They are ${form} it down now.`, '他们正在把它放下。']
    return [`They ${form} it down.`, '他们把它放下。']
  },
  tell(form, slot) {
    if (slot === 'past') return [`They ${form} them yesterday.`, '他们昨天告诉了别人。']
    if (slot === 'pp') return [`They have ${form} them before.`, '他们以前告诉过别人。']
    if (slot === 'ing') return [`They are ${form} them now.`, '他们正在告诉别人。']
    return [`They ${form} them every day.`, '他们每天都告诉别人。']
  },
}

function isJunkExample(sentence) {
  return /Please .+ carefully\.|tried to .+ again\.|decided to |need to .+ this first\.|talked about the |wrote down the /i.test(sentence)
}

function hasForm(sentence, form) {
  const needle = String(form || '').trim()
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i').test(sentence)
}

function thirdPerson(base) {
  const word = String(base || '')
  if (!word) return ''
  if (word.toLowerCase() === 'have') return 'has'
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

function realExamples(senses) {
  const out = []
  const seen = new Set()
  for (const sense of senses || []) {
    for (const pair of sense.examples || []) {
      const en = String(pair?.[0] || '').trim()
      const zh = String(pair?.[1] || '').trim()
      if (!en || seen.has(en) || isJunkExample(en)) continue
      seen.add(en)
      out.push([en, zh])
    }
  }
  return out
}

function paradigmFrom(parts) {
  const clean = (value) => {
    const text = String(value || '').trim()
    return text && text !== '—' ? text : ''
  }
  return {
    base: clean(parts?.[0]),
    past: clean(parts?.[1]),
    pp: clean(parts?.[2]),
    ing: clean(parts?.[3]),
  }
}

function matchesVerbSlot(sentence, slot, paradigm) {
  const form = paradigm[slot]
  if (!form || !hasForm(sentence, form)) return false
  const tokens = (sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || []).map((token) => token.toLowerCase())
  const index = tokens.indexOf(form.toLowerCase())
  const prev = tokens[index - 1] || ''
  const aux = ['have', 'has', 'had', 'been'].includes(prev)
  const same = (left, right) => left && right && left.toLowerCase() === right.toLowerCase()
  if (slot === 'ing') return true
  if (slot === 'pp') return same(paradigm.pp, paradigm.past) || same(paradigm.pp, paradigm.base) ? aux : true
  if (slot === 'past') {
    if (aux) return false
    if (same(paradigm.past, paradigm.base)) return /\byesterday\b/i.test(sentence)
    return true
  }
  if (aux || (same(paradigm.past, paradigm.base) && /\byesterday\b/i.test(sentence))) return false
  return true
}

function retargetSentence(sentence, paradigm, slot) {
  const target = paradigm[slot]
  const found = String(sentence || '').match(/^(She|He|It|They|We|I|You) ([A-Za-z]+(?:['’][A-Za-z]+)?)(.*)$/)
  if (!target || !found) return ''
  const [, subject, verb, rest] = found
  const sources = [thirdPerson(paradigm.base), paradigm.base, paradigm.past, paradigm.pp, paradigm.ing]
  if (!sources.some((from) => from && from.toLowerCase() === verb.toLowerCase() && from.toLowerCase() !== target.toLowerCase())) {
    return ''
  }
  let next = ''
  if (slot === 'base') {
    const actor = subject === 'She' || subject === 'He' || subject === 'It' ? 'They' : subject
    next = `${actor} ${target}${rest}`
  } else if (slot === 'past') {
    next = `${subject} ${target}${rest}`
  } else if (slot === 'pp') {
    const aux = subject === 'She' || subject === 'He' || subject === 'It' ? 'has' : 'have'
    next = `${subject} ${aux} ${target}${rest}`
  } else if (slot === 'ing') {
    const aux = subject === 'She' || subject === 'He' || subject === 'It' ? 'is' : subject === 'I' ? 'am' : 'are'
    next = `${subject === 'He' || subject === 'It' ? 'She' : subject} ${aux} ${target}${rest}`
  }
  if (!next || !hasForm(next, target) || !matchesVerbSlot(next, slot, paradigm)) return ''
  return next
}

function secondExampleLine(pattern, form, slot, gloss) {
  const zh = gloss || '做'
  const cap = capWord(form)
  if (pattern === 'link') {
    if (slot === 'past') return [`Things ${form} clear then.`, `那时事情${/变成|变得/.test(zh) ? '变得清楚' : /保持/.test(zh) ? '保持清楚' : '看起来清楚'}。`]
    if (slot === 'pp') return [`Things have ${form} clear for a long time.`, `事情很久以来都${/变成|变得/.test(zh) ? '变得清楚' : '看起来清楚'}。`]
    if (slot === 'ing') return [`${cap} clear is a start.`, `${/变成|变得/.test(zh) ? '变得清楚' : '看起来清楚'}是个开始。`]
    return [`Things ${form} clear today.`, `事情今天${/变成|变得/.test(zh) ? '变得清楚' : '看起来清楚'}。`]
  }
  if (pattern === 'belong') {
    if (slot === 'past') return [`They ${form} here then.`, '他们那时属于这里。']
    if (slot === 'pp') return [`They have ${form} here for years.`, '他们多年来属于这里。']
    if (slot === 'ing') return [`${cap} here feels right.`, '属于这里是合适的。']
    return [`We ${form} here too.`, '我们也属于这里。']
  }
  if (pattern === 'consist') {
    if (slot === 'past') return [`They ${form} of two parts then.`, '它们那时由两部分组成。']
    if (slot === 'pp') return [`They have ${form} of two parts for years.`, '它们多年来由两部分组成。']
    if (slot === 'ing') return [`${cap} of two parts is normal.`, '由两部分组成是正常的。']
    return [`We ${form} of two parts.`, '我们由两部分组成。']
  }
  if (pattern === 'cost') {
    if (slot === 'past') return [`They ${form} money then.`, '它们那时要花钱。']
    if (slot === 'pp') return [`They have ${form} money for years.`, '它们多年来要花钱。']
    if (slot === 'ing') return [`${cap} money is expected.`, '要花钱是预料之中的。']
    return [`These ${form} money too.`, '这些也要花钱。']
  }
  if (pattern === 'exist') {
    if (slot === 'past') return [`They ${form} then.`, '它们那时存在。']
    if (slot === 'pp') return [`They have ${form} for years.`, '它们多年来都存在。']
    if (slot === 'ing') return [`${cap} here is enough.`, '在这里存在就够了。']
    return [`These ${form} too.`, '这些也存在。']
  }
  const object = pattern === 'obj' || pattern === 'stative-obj'
  const stative = pattern === 'stative-obj' || pattern === 'stative-intrans'
  if (slot === 'past') return object ? [`She ${form} it then.`, `她那时${zh}了。`] : [`She ${form} then.`, `她那时${zh}了。`]
  if (slot === 'pp') {
    return object
      ? [`People have ${form} it for years.`, `人们多年来${zh}过。`]
      : [`People have ${form} for years.`, `人们多年来${zh}过。`]
  }
  if (slot === 'ing') {
    if (stative) return object ? [`People like ${form} it.`, `人们愿意${zh}。`] : [`People like ${form}.`, `人们愿意${zh}。`]
    return object ? [`I saw them ${form} it.`, `我看见他们正在${zh}。`] : [`I saw them ${form}.`, `我看见他们正在${zh}。`]
  }
  return object ? [`Can they ${form} it?`, `他们能${zh}吗？`] : [`Can they ${form}?`, `他们能${zh}吗？`]
}

function takeTwo(lines, form) {
  const chosen = []
  for (const line of lines) {
    if (!line || chosen.length >= 2) continue
    const en = String(line[0] || '').trim()
    if (!en || !hasForm(en, form) || chosen.some((item) => item[0] === en)) continue
    chosen.push([en, String(line[1] || '').trim()])
  }
  return chosen
}

function verbExamples(base, form, slot, gloss, senses, parts) {
  const paradigm = paradigmFrom(parts)
  paradigm[slot] = form
  const pattern = examplePattern(base, gloss, senses)
  const lines = []
  for (const pair of realExamples(senses)) {
    if (matchesVerbSlot(pair[0], slot, paradigm)) lines.push(pair)
  }
  for (const pair of realExamples(senses)) {
    const next = retargetSentence(pair[0], paradigm, slot)
    if (next) lines.push([next, pair[1]])
  }
  const custom = CUSTOM_EXAMPLES[String(base || '').toLowerCase()]
  if (custom) {
    const line = custom(form, slot)
    if (line) lines.push(line)
  }
  lines.push(exampleLine(pattern, form, slot, gloss))
  lines.push(secondExampleLine(pattern, form, slot, gloss))
  return takeTwo(lines, form)
}

function surfaceExamples(kind, word, senses) {
  const raw = (senses || []).find((sense) => sense?.zh)?.zh
  const gloss = raw ? shortGloss(raw) : '这个'
  const real = realExamples(senses).filter((pair) => hasForm(pair[0], word))
  const extra =
    kind === 'noun'
      ? [
          [`This is a ${word}.`, `这是${gloss}。`],
          [`I know this ${word}.`, `我知道这个${gloss}。`],
        ]
      : kind === 'plural'
        ? [
            [`I can see two ${word}.`, `我能看见两个${gloss}。`],
            [`These ${word} are here.`, `这些${gloss}在这里。`],
          ]
        : kind === 'adj'
          ? [
              [`This is ${word}.`, `这很${gloss}。`],
              [`It feels ${word}.`, `这感觉很${gloss}。`],
            ]
          : kind === 'comp'
            ? [
                [`This one is ${word}.`, `这个更${gloss.replace(/的$/, '')}。`],
                [`It is ${word} than that one.`, `这个比那个更${gloss.replace(/的$/, '')}。`],
              ]
            : kind === 'sup'
              ? [
                  [`This one is the ${word}.`, `这个是最${gloss.replace(/的$/, '')}的。`],
                  [`It is the ${word} of all.`, `这是所有里面最${gloss.replace(/的$/, '')}的。`],
                ]
              : [
                  [`People use ${word} here.`, `这里会用到${gloss}。`],
                  [`I heard ${word} today.`, `我今天听到了${gloss}。`],
                ]
  return takeTwo([...real, ...extra], word)
}

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

function pushForm(items, name, pos, word, examples) {
  const text = String(word || '').trim()
  if (!text || text === '—') return
  const item = { label: `${name}（${pos}）`, word: text }
  if (examples?.length) item.examples = examples
  items.push(item)
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
      const item = { label: pos ? `无词形变化（${pos}）` : '无词形变化', word: '' }
      const examples = headword ? surfaceExamples('plain', headword, senses) : []
      if (examples.length) item.examples = examples
      items.push(item)
      continue
    }
    if (text === '本身常作最高级') {
      pushForm(items, '最高级', '形容词', headword, surfaceExamples('sup', headword, senses))
      continue
    }
    if (text.startsWith('复数 ')) {
      const pos = families.includes('名词') ? '名词' : families[0] || '名词'
      const word = text.slice('复数 '.length)
      pushForm(items, '复数', pos, word, surfaceExamples('plural', word, senses))
      continue
    }
    const match = text.match(/^(动词|名词|形容词|副词|数词|代词)\s+(.+)$/)
    if (!match) {
      pushForm(items, '词形', families[0] || '其他', text)
      continue
    }
    const pos = match[1]
    const parts = match[2].split(' / ')
    const names = pos === '形容词' ? ADJECTIVE_SLOTS : pos === '名词' ? NOUN_SLOTS : null
    const gloss = pos === '动词' ? displayGloss(senses) : ''
    const base = String(parts[0] || headword || '').trim()
    parts.forEach((part, index) => {
      const text = String(part || '').trim()
      if (pos === '动词') {
        if (!text || text === '—') return
        items.push({
          label: VERB_LABELS[index] || 'form',
          word: text,
          examples: verbExamples(base, text, VERB_SLOTS[index], gloss, senses, parts),
        })
        return
      }
      const kind = pos === '名词' ? (index === 1 ? 'plural' : 'noun') : pos === '形容词' ? ['adj', 'comp', 'sup'][index] || 'adj' : ''
      pushForm(items, names?.[index] || '词形', pos, text, kind ? surfaceExamples(kind, text, senses) : undefined)
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
