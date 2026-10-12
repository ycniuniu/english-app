const NATURAL =
  /samantha|nicky|aaron|alex|google us english|google uk english female|daniel|karen|moira|tessa/i
const NOVELTY =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|zarvox|wobble/i

export function voiceKind(voice) {
  const lang = String(voice?.lang || '')
    .toLowerCase()
    .replaceAll('_', '-')
  if (lang.startsWith('en-us')) return 'us'
  if (lang.startsWith('en-gb')) return 'gb'
  if (lang.startsWith('en')) return 'other'
  return null
}

function scoreVoice(voice) {
  const name = voice?.name || ''
  let score = 0
  if (voice?.default) score += 2
  if (voice?.localService) score += 1
  if (NATURAL.test(name)) score += 6
  if (/premium|enhanced|natural/i.test(name)) score += 3
  if (NOVELTY.test(name)) score -= 8
  return score
}

function pickBest(voices) {
  if (!voices.length) return null
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

function langOf(voice) {
  return String(voice?.lang || '').toLowerCase().replaceAll('_', '-')
}

function pickNamed(voices, prefix, natural) {
  let pool = (voices || []).filter((voice) => langOf(voice).startsWith(prefix))
  if (prefix === 'ja') {
    const japan = pool.filter((voice) => langOf(voice).startsWith('ja-jp'))
    const anyJa = pool.filter((voice) => langOf(voice) === 'ja' || langOf(voice).startsWith('ja-'))
    if (japan.length) pool = japan
    else if (anyJa.length) pool = anyJa
  }
  if (!pool.length) return null
  return [...pool].sort((a, b) => {
    const bonus = (voice) => (natural.test(voice?.name || '') ? 6 : 0)
    return scoreVoice(b) + bonus(b) - (scoreVoice(a) + bonus(a))
  })[0]
}

export function chooseVoice(voices, language = 'en') {
  if (language === 'ja') {
    return pickNamed(voices, 'ja', /kyoko|otoya|o-ren|nanami|haruka|hattori|google 日本語|google 日语|google japanese/i)
  }
  if (language === 'zh') {
    return pickNamed(voices, 'zh-cn', /ting-ting|tingting|sinji|meijia|google 普通话|google 國語/i)
      || pickNamed(voices, 'zh', /ting-ting|tingting|chinese/i)
  }
  const groups = { us: [], gb: [], other: [] }
  for (const voice of voices || []) {
    const kind = voiceKind(voice)
    if (kind) groups[kind].push(voice)
  }
  return pickBest(groups.us) || pickBest(groups.gb) || pickBest(groups.other) || null
}

export function japaneseKind(voices) {
  if (!voices || voices.length === 0) return 'pending'
  return chooseVoice(voices, 'ja') ? 'ja' : 'none'
}

export function japanesePhrase(kind) {
  if (kind === 'ja') return '日语发音'
  if (kind === 'none') return '未找到日语语音'
  if (kind === 'unsupported') return '浏览器不支持朗读'
  return '正在准备语音'
}

export function chosenKind(voices) {
  if (!voices || voices.length === 0) return 'pending'
  const voice = chooseVoice(voices)
  if (!voice) return 'none'
  return voiceKind(voice)
}

export function voicePhrase(kind) {
  switch (kind) {
    case 'us':
      return '美式发音'
    case 'gb':
      return '英式发音'
    case 'other':
      return '英语发音'
    case 'none':
      return '未找到英语语音'
    case 'unsupported':
      return '浏览器不支持朗读'
    default:
      return '正在准备语音'
  }
}
