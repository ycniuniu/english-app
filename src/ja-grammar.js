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

function shortJaGloss(entry) {
  const head = String(entry?.senses?.[0]?.zh || '')
    .split(/[（(，,；;]/)[0]
    .trim()
  return head || '这个'
}

const PLAIN_SECOND = {
  どうぞ: ['どうぞ入ってください。', '请进。'],
  ゆっくりと: ['ゆっくりと歩きます。', '慢慢地走。'],
  しっかり: ['しっかり食べます。', '好好吃饭。'],
  しばらく: ['しばらく待ちます。', '等一会儿。'],
  はっきり: ['はっきり言います。', '说清楚。'],
  すっと: ['すっと立ちます。', '一下子站起来。'],
  ちゃんと: ['ちゃんと寝ます。', '好好睡觉。'],
  ゆっくり: ['ゆっくり話します。', '慢慢说。'],
  じっと: ['じっと見ます。', '目不转睛地看。'],
  びっくり: ['びっくりしました。', '吓了一跳。'],
  がっかり: ['がっかりしました。', '感到失望。'],
  きちんと: ['きちんと並べます。', '整齐地摆好。'],
  そっと: ['そっと置きます。', '轻轻放下。'],
  のんびり: ['のんびり休みます。', '悠闲地休息。'],
  よると: ['場合によると、延期します。', '看情况会延期。'],
  にっこり: ['にっこり笑います。', '微微一笑。'],
  何とか: ['何とか間に合いました。', '总算赶上了。'],
  一定: ['時間は一定です。', '时间是固定的。'],
  うっかり: ['うっかり忘れました。', '不小心忘了。'],
  すっきり: ['すっきりしました。', '感觉舒畅了。'],
  生き生き: ['生き生きしています。', '很有生气。'],
  うろうろ: ['うろうろします。', '转来转去。'],
  のろのろ: ['のろのろ歩きます。', '慢吞吞地走。'],
  にこにこ: ['にこにこ笑います。', '笑眯眯的。'],
  そうっと: ['そうっと開けます。', '悄悄地打开。'],
  どきどき: ['どきどきします。', '心里扑通扑通跳。'],
  はきはき: ['はきはき答えます。', '清楚利落地回答。'],
  まごまご: ['まごまごします。', '不知所措。'],
  来る: ['明日、友だちが来る。', '明天朋友要来。'],
  うんざり: ['うんざりします。', '感到厌烦。'],
  ほっと: ['ほっとしました。', '松了一口气。'],
  ひょっと: ['ひょっとしたら、雨が降ります。', '也许会下雨。'],
  きっちり: ['きっちり合わせます。', '对得整整齐齐。'],
  すんなり: ['すんなり決まりました。', '顺利地定下来了。'],
  あっさり: ['あっさり負けました。', '轻易地输了。'],
  匹敵: ['彼に匹敵する人はいません。', '没有人能和他相比。'],
  きっぱり: ['きっぱり断ります。', '干脆地拒绝。'],
  丸々: ['丸々太っています。', '长得圆圆胖胖的。'],
  がっちり: ['がっちり握ります。', '紧紧握住。'],
  くっきり: ['くっきり見えます。', '看得清清楚楚。'],
  きちっと: ['きちっとたたみます。', '整整齐齐地叠好。'],
  ちやほや: ['ちやほやされます。', '被人捧着。'],
  おどおど: ['おどおどします。', '畏畏缩缩。'],
  がっしり: ['がっしりしています。', '长得结实。'],
  げっそり: ['げっそり痩せました。', '瘦了一大圈。'],
  どうにか: ['どうにか終わりました。', '总算结束了。'],
  凝乎と: ['凝乎と座ります。', '一动不动地坐着。'],
  ほんのり: ['ほんのり甘いです。', '有一点点甜。'],
  カッと: ['カッと怒ります。', '一下子火了。'],
  ドキドキ: ['ドキドキします。', '心里怦怦跳。'],
  キラキラ: ['星がキラキラします。', '星星闪闪发光。'],
  パッと: ['パッと明るくなります。', '一下子亮了。'],
  こそこそ: ['こそこそ話します。', '偷偷地说话。'],
  わくわく: ['わくわくします。', '心里兴奋。'],
  ガンガン: ['頭がガンガンします。', '头一阵阵地疼。'],
  びくびく: ['びくびくします。', '吓得发抖。'],
  ぴりぴり: ['空気がぴりぴりします。', '气氛很紧张。'],
  いそいそ: ['いそいそと出かけます。', '兴冲冲地出门。'],
  ニヤニヤ: ['ニヤニヤ笑います。', '得意地笑。'],
  くよくよ: ['失敗しても、くよくよしない。', '失败了也不烦恼。'],
  さらさら: ['川がさらさら流れます。', '河水轻轻地流。'],
  そわそわ: ['そわそわします。', '坐立不安。'],
  プンプン: ['プンプン怒っています。', '气呼呼的。'],
  ひっそり: ['ひっそり暮らします。', '悄悄地过日子。'],
  くるくる: ['目がくるくる回ります。', '眼睛骨碌碌地转。'],
  愛用: ['このペンを愛用しています。', '一直爱用这支笔。'],
  ぼーっと: ['ぼーっとします。', '发呆。'],
  ニコニコ: ['ニコニコしています。', '笑嘻嘻的。'],
  うずうず: ['うずうずします。', '心里痒痒的。'],
  ぎゅっと: ['ぎゅっと抱きます。', '紧紧抱住。'],
  ハラハラ: ['ハラハラします。', '提心吊胆。'],
  ぐったり: ['ぐったりしています。', '浑身没力气。'],
  ムカムカ: ['ムカムカします。', '心里直冒火。'],
  ドキッと: ['ドキッとしました。', '心里猛地一跳。'],
  くどくど: ['くどくど言います。', '絮絮叨叨地说。'],
  揺ら揺ら: ['木が揺ら揺らします。', '树摇来摇去。'],
  オドオド: ['オドオドします。', '慌慌张张。'],
  キョロキョロ: ['キョロキョロ見ます。', '东张西望。'],
  だらだら: ['だらだら話します。', '没完没了地说。'],
  パチパチ: ['パチパチと拍手します。', '啪啪地鼓掌。'],
  うとうと: ['うとうと眠ります。', '打着盹。'],
  ぴんぴん: ['ぴんぴんしています。', '精神得很。'],
  よちよち: ['よちよち歩きます。', '摇摇晃晃地走。'],
  ぞくぞく: ['ぞくぞくします。', '一阵阵地发冷。'],
  しょんぼり: ['しょんぼりしています。', '无精打采。'],
  せかせか: ['せかせか歩きます。', '急匆匆地走。'],
  よろよろ: ['よろよろ歩きます。', '摇摇晃晃地走。'],
  ギラギラ: ['太陽がギラギラします。', '太阳明晃晃的。'],
  ざわざわ: ['教室がざわざわします。', '教室里一片嘈杂。'],
  ポタポタ: ['雨がポタポタ落ちます。', '雨滴答滴答地落。'],
  おろおろ: ['おろおろします。', '不知所措。'],
  がやがや: ['みんなががやがやしています。', '大家吵吵嚷嚷。'],
  じめじめ: ['部屋がじめじめします。', '房间潮乎乎的。'],
  ちらちら: ['ちらちら見ます。', '不住地偷看。'],
  ぶるぶる: ['ぶるぶる震えます。', '瑟瑟发抖。'],
  ぽかぽか: ['日がぽかぽかしています。', '太阳暖洋洋的。'],
}

function uniqueJaExamples(entry) {
  const out = []
  const seen = new Set()
  for (const sense of entry?.senses || []) {
    for (const pair of sense.examples || []) {
      const ja = String(pair?.[0] || '').trim()
      const zh = String(pair?.[1] || '').trim()
      if (!ja || seen.has(ja)) continue
      seen.add(ja)
      out.push([ja, zh])
    }
  }
  return out
}

function withForm(lines, form) {
  const chosen = []
  for (const line of lines) {
    if (!line || chosen.length >= 2) continue
    const ja = String(line[0] || '').trim()
    if (!ja || !ja.includes(form) || chosen.some((item) => item[0] === ja)) continue
    chosen.push([ja, String(line[1] || '').trim()])
  }
  return chosen
}

export function examplesForJaEntry(entry, form) {
  const gloss = shortJaGloss(entry)
  const word = form?.word || entry?.word || ''
  const name = form?.name || ''
  const existing = uniqueJaExamples(entry).filter((pair) => word && pair[0].includes(word))
  if (!form) {
    const lines = [...uniqueJaExamples(entry)]
    if (lines.length < 2 && (entry?.pos || []).includes('名词') && word) {
      lines.push([`これは${word}です。`, `这是${gloss}。`])
    }
    if (lines.length < 2 && PLAIN_SECOND[word]) lines.push(PLAIN_SECOND[word])
    const chosen = []
    for (const line of lines) {
      if (chosen.length >= 2 || chosen.some((item) => item[0] === line[0])) continue
      chosen.push(line)
    }
    return chosen
  }
  const extra =
    name === 'ます形'
      ? [
          [`毎日${word}。`, `每天都${gloss}。`],
          [`今${word}。`, `现在${gloss}。`],
        ]
      : name === 'て形'
        ? [
            [`${word}ください。`, `请${gloss}。`],
            [`${word}もいいです。`, `${gloss}也可以。`],
          ]
        : name === 'た形'
          ? [
              [`昨日${word}。`, `昨天${gloss}了。`],
              [`もう${word}。`, `已经${gloss}了。`],
            ]
          : name === '可能形'
            ? [
                [`一人で${word}。`, `一个人也能${gloss}。`],
                [`${word}ようになりました。`, `已经能${gloss}了。`],
              ]
            : name === '否定形'
              ? [
                  [`これは${word}。`, `这个不${gloss}。`],
                  [`今日は${word}。`, `今天不${gloss}。`],
                ]
              : name === '过去形'
                ? [
                    [`昨日は${word}。`, `昨天很${gloss}。`],
                    [`前は${word}。`, `以前很${gloss}。`],
                  ]
                : []
  return withForm([...existing, ...extra], word)
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
