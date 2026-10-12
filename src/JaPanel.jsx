import { useEffect, useRef, useState } from 'react'
import { answersMatchJa } from './ja-answer.js'
import { cardItem, JA_STORAGE_KEY, loadJaProgress, trackIds } from './ja-progress.js'
import { SpeakButton } from './SpeakButton.jsx'
import { stopSpeech } from './speech.js'
import { readJson, writeJson } from './storage.js'
import {
  NEW_BATCH,
  buildQueueFromIds,
  cardOf,
  duePhrase,
  gradeCard,
  needsPreview,
  summarizeIds,
  todayKey,
} from './srs.js'

const TRACKS = [
  { id: 'word', label: '词汇' },
  { id: 'kana', label: '假名词' },
  { id: 'verb', label: '动词变形' },
]

function formPos(entry) {
  const labels = entry.pos || []
  if (labels.includes('动词')) return '动词'
  if (labels.includes('形容词')) return '形容词'
  return labels[0] || '词'
}

function JaLine({ text, zh, id, rate, label }) {
  return (
    <div className="spoken-line">
      <div className="line-with-speak">
        <p className="example-en" lang="ja">
          {text}
        </p>
        <SpeakButton text={text} id={id} rate={rate} label={label} compact lang="ja-JP" />
      </div>
      {zh ? <p className="example-zh">{zh}</p> : null}
    </div>
  )
}

function JaFacts({ item, reveal, rate }) {
  const entry = item.entry
  const labels = entry.pos || []
  const speakId = `ja-${item.key}`
  const forms = item.kind === 'conj' ? (item.form ? [item.form] : []) : entry.forms || []
  const posName = formPos(entry)

  return (
    <div className="word-facts">
      {labels.length ? (
        <div className="fact-block">
          <div className="fact-head">
            <p className="fact-label">词性</p>
            <SpeakButton
              text={labels.join('、')}
              id={`${speakId}-pos`}
              rate={rate}
              label="朗读词性"
              compact
              lang="zh-CN"
            />
          </div>
          <p className="pos-row">
            {labels.map((label) => (
              <span key={label} className="sense-pos">
                {label}
              </span>
            ))}
          </p>
        </div>
      ) : null}
      {reveal ? (
        <div className="fact-block">
          <p className="fact-label">词形</p>
          <ul className="form-list">
            {forms.length ? (
              forms.map((form) => (
                <li key={form.key}>
                  <span className="form-label">
                    {form.name}（{posName}）
                  </span>
                  <span className="form-word" lang="ja">
                    {form.word}
                  </span>
                  <SpeakButton
                    text={form.reading || form.word}
                    id={`${speakId}-form-${form.key}`}
                    rate={rate}
                    label={`朗读${form.name}`}
                    compact
                    lang="ja-JP"
                  />
                </li>
              ))
            ) : (
              <li>
                <span className="form-label">无词形变化（{posName}）</span>
                <SpeakButton
                  text={entry.reading || entry.word}
                  id={`${speakId}-form-none`}
                  rate={rate}
                  label="朗读读音"
                  compact
                  lang="ja-JP"
                />
              </li>
            )}
          </ul>
        </div>
      ) : null}
      <div className="fact-block">
        <p className="fact-label">{reveal ? '释义' : '同一个词的几条中文'}</p>
        {(entry.senses || []).map((sense, senseIndex) => (
          <div key={`${sense.pos}-${sense.zh}-${senseIndex}`} className="sense">
            <p className="sense-head">
              <span className="sense-pos">{sense.pos}</span>
              <span className="sense-zh">{sense.zh}</span>
              <SpeakButton
                text={sense.zh}
                id={`${speakId}-zh-${senseIndex}`}
                rate={rate}
                label="朗读这条释义"
                compact
                lang="zh-CN"
              />
            </p>
            {reveal
              ? (sense.examples || []).map(([ja, zh], index) => (
                  <div key={`${index}-${ja}`} className="example">
                    <JaLine
                      text={ja}
                      zh={zh}
                      id={`${speakId}-ex-${senseIndex}-${index}`}
                      rate={rate}
                      label="朗读这个例句"
                    />
                  </div>
                ))
              : null}
          </div>
        ))}
      </div>
      {reveal ? (
        <div className="fact-block">
          <p className="fact-label">搭配</p>
          <ul className="phrases">
            {(entry.phrases || []).map(([ja, zh], index) => (
              <li key={`${index}-${ja}`}>
                <JaLine text={ja} zh={zh} id={`${speakId}-ph-${index}`} rate={rate} label="朗读这个搭配" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function percent(part, total) {
  if (!total || !part) return '0%'
  return `${Math.max(1.5, Math.min(100, (part / total) * 100))}%`
}

function homeCopy(stats, missRound, track) {
  const unit = track === 'verb' ? '道题' : '个词'
  if (stats.fresh === 0 && stats.due === 0) {
    return {
      heading: '今天没有要背的',
      lead: '这一组都学过了，今天也没有到期的。明天再打开，会按间隔排进来。',
    }
  }
  if (missRound && stats.due > 0) {
    return {
      heading: `还有 ${stats.due} ${unit}没记住`,
      lead: '这几个今天还会再出现。写对一次，就会排到后面的日子。',
    }
  }
  if (stats.due > 0) {
    return {
      heading: `今天有 ${stats.due} ${unit}要复习`,
      lead: '先写到期的，再认几个新的。写对了间隔拉长，写错了留在今天。',
    }
  }
  if (stats.learned > 0) {
    return {
      heading: '今天的复习做完了',
      lead: '到期的都写过了。要是还想继续，可以再认一批新的。',
    }
  }
  if (track === 'kana') {
    return {
      heading: '从最常用的片假名开始',
      lead: '外来词会按音节拆开。合上以后只留中文，把日语写出来。写对了，下次隔得更久；写错了，今天还会再遇到。',
    }
  }
  if (track === 'verb') {
    return {
      heading: '动词变形单独练',
      lead: '先看词典形和变形。合上以后，根据中文和词典形，写出ます形、て形、た形或可能形。写对了间隔拉长，写错了留在今天。',
    }
  }
  return {
    heading: '从最常用的词开始',
    lead: '新词先看日语和中文。合上以后，只留中文，把日语写出来。汉字或假名都可以。写对了，下次隔得更久；写错了，今天还会再遇到。',
  }
}

function Headword({ item, rate }) {
  const entry = item.entry
  const surface = item.kind === 'conj' ? item.form.word : entry.word
  const reading = item.kind === 'conj' ? item.form.reading : entry.reading
  const spoken = reading || surface
  return (
    <>
      <div className="word-en-row">
        <p className="word-en" lang="ja">
          {surface}
        </p>
        <SpeakButton text={spoken} id={`ja-${item.key}-head`} rate={rate} label="朗读这个词" lang="ja-JP" />
      </div>
      {reading && reading !== surface ? (
        <p className="word-ph" lang="ja">
          {reading}
        </p>
      ) : null}
      {item.kind === 'kana' && entry.syllables?.length ? (
        <p className="syllables" lang="ja">
          音节 {entry.syllables.join('・')}
        </p>
      ) : null}
      {item.kind === 'conj' ? (
        <p className="lemma" lang="ja">
          词典形 {entry.word}
          {entry.reading && entry.reading !== entry.word ? `　${entry.reading}` : ''}
        </p>
      ) : null}
    </>
  )
}

export function JaPanel({ rate }) {
  const [pack, setPack] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [track, setTrack] = useState('word')
  const [cards, setCards] = useState(() => loadJaProgress(readJson(JA_STORAGE_KEY, null)).cards)
  const [queue, setQueue] = useState(null)
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('home')
  const [draft, setDraft] = useState('')
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)
  const [missRound, setMissRound] = useState(false)
  const inputRef = useRef(null)
  const phaseRef = useRef('home')
  const today = todayKey()

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    let alive = true
    setFailed(false)
    import('./data/jlpt-words.js')
      .then((mod) => {
        if (!alive) return
        setPack({ words: mod.words || [], meta: mod.listMeta || {} })
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [attempt])

  useEffect(() => {
    writeJson(JA_STORAGE_KEY, { cards })
  }, [cards])

  useEffect(() => {
    if (phase === 'recall') inputRef.current?.focus()
  }, [phase, step])

  const words = pack?.words || null
  const ids = words ? trackIds(words, track) : []
  const stats = summarizeIds(cards, ids, today)
  const current = queue && words ? cardItem(words, queue[step]) : null

  function selectTrack(next) {
    if (next === track) return
    stopSpeech()
    phaseRef.current = 'home'
    setTrack(next)
    setQueue(null)
    setPhase('home')
    setMissRound(false)
    setResult(null)
    setDraft('')
    setTyped('')
  }

  function openRound(newBatch) {
    if (!words) return
    const next = buildQueueFromIds(cards, trackIds(words, track), today, newBatch)
    if (!next.length) return
    stopSpeech()
    const first = cardOf(cards, next[0])
    const nextPhase = needsPreview(first) ? 'preview' : 'recall'
    phaseRef.current = nextPhase
    setQueue(next)
    setStep(0)
    setDraft('')
    setTyped('')
    setResult(null)
    setPhase(nextPhase)
    if (newBatch > 0) setMissRound(false)
  }

  function cover() {
    stopSpeech()
    setDraft('')
    phaseRef.current = 'recall'
    setPhase('recall')
    inputRef.current?.focus()
  }

  function grade(correct) {
    if (!current || phaseRef.current === 'result') return
    phaseRef.current = 'result'
    const graded = gradeCard(cardOf(cards, current.key), correct, today)
    setCards((prev) => ({ ...prev, [current.key]: graded }))
    setTyped(draft)
    setResult({ correct, card: graded })
    setPhase('result')
    stopSpeech()
  }

  function confirm() {
    if (!current || !draft.trim()) return
    grade(answersMatchJa(draft, current.answers))
  }

  function goNext() {
    if (!queue || phaseRef.current !== 'result') return
    const nextStep = step + 1
    if (nextStep >= queue.length) {
      phaseRef.current = 'home'
      setQueue(null)
      setPhase('home')
      setMissRound(true)
      setResult(null)
      setDraft('')
      return
    }
    const nextCard = cardOf(cards, queue[nextStep])
    phaseRef.current = needsPreview(nextCard) ? 'preview' : 'recall'
    setStep(nextStep)
    setDraft('')
    setTyped('')
    setResult(null)
    setPhase(phaseRef.current)
  }

  const freshBatch = Math.min(NEW_BATCH, stats.fresh)
  const noun = track === 'verb' ? '道变形' : '个新词'
  const dueNoun = track === 'verb' ? '道题' : '个'
  let primary = null
  let secondary = null
  if (words) {
    if (missRound && stats.due > 0) {
      primary = { label: `再复习错题 ${stats.due} ${dueNoun}`, batch: 0 }
      if (freshBatch > 0) secondary = { label: `再学 ${freshBatch} ${noun}`, batch: freshBatch }
    } else if (stats.due > 0 && freshBatch > 0) {
      primary = { label: `开始今天的 ${stats.due + freshBatch} ${dueNoun}`, batch: freshBatch }
    } else if (stats.due > 0) {
      primary = { label: `复习今天的 ${stats.due} ${dueNoun}`, batch: 0 }
    } else if (freshBatch > 0) {
      primary = { label: `学习 ${freshBatch} ${noun}`, batch: freshBatch }
    }
  }

  const meta = pack?.meta || {}
  const jlptCount = (meta.n5 || 0) + (meta.n4 || 0) + (meta.n3 || 0) + (meta.n2 || 0) + (meta.n1 || 0)

  let body
  if (!words) {
    body = (
      <div className="words-body">
        <p className="meta" role="status">
          {failed ? '词表没有载入。' : '正在准备词表…'}
        </p>
        {failed ? (
          <button type="button" className="go" onClick={() => setAttempt((value) => value + 1)}>
            重试
          </button>
        ) : null}
      </div>
    )
  } else if (!queue || !current) {
    const copy = homeCopy(stats, missRound, track)
    body = (
      <>
        <div className="words-body">
          <p className="kicker">日语练习</p>
          <div className="tracks" role="group" aria-label="练习分组">
            {TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={track === item.id}
                onClick={() => selectTrack(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <h2>{copy.heading}</h2>
          <p className="lead">{copy.lead}</p>
          <div
            className="mastery"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.total}
            aria-valuenow={stats.mastered}
            aria-label="掌握进度"
          >
            <span className="mastery-learned" style={{ width: percent(stats.learned, stats.total) }} />
            <span className="mastery-mastered" style={{ width: percent(stats.mastered, stats.total) }} />
          </div>
          <p className="meta">
            已学 {stats.learned.toLocaleString('zh-CN')} · 熟悉 {stats.familiar.toLocaleString('zh-CN')} · 掌握{' '}
            {stats.mastered.toLocaleString('zh-CN')}
          </p>
          <p className="meta">这一组 {stats.total.toLocaleString('zh-CN')} 项。</p>
          <p className="meta">
            公开的 N5 到 N1 词表已全部收录，共 {jlptCount.toLocaleString('zh-CN')}{' '}
            个，按等级和词频排列。其余 {(meta.extra || 0).toLocaleString('zh-CN')}{' '}
            个按 JMdict 词频补到 {(meta.total || words.length).toLocaleString('zh-CN')}，标成「高频」。日语进度和英语分开，只存在这台设备上。
          </p>
        </div>
        {primary ? (
          <div className="words-bar">
            {secondary ? (
              <button type="button" className="ghost" onClick={() => openRound(secondary.batch)}>
                {secondary.label}
              </button>
            ) : null}
            <button type="button" className="go" onClick={() => openRound(primary.batch)}>
              {primary.label}
            </button>
          </div>
        ) : null}
      </>
    )
  } else if (phase === 'result' && result) {
    const gloss = current.entry.senses?.[0]?.zh || ''
    body = (
      <>
        <div className="words-body">
          <p className="meta">
            {current.entry.level}
            {current.kind === 'conj' ? ` · ${current.form.name}` : ''} · 第 {step + 1} / {queue.length} 个
          </p>
          <div className={result.correct ? 'result-card ok' : 'result-card bad'}>
            <p className="result-flag">{result.correct ? '记住了' : '先记下这个写法'}</p>
            <Headword item={current} rate={rate} />
            <p className="word-zh">{gloss}</p>
            <JaFacts item={current} reveal rate={rate} />
            {!result.correct && typed.trim() ? <p className="typed">你写的是 {typed.trim()}</p> : null}
            <p className="due-note">{duePhrase(result.card, today)}</p>
          </div>
        </div>
        <div className="words-bar">
          <button type="button" className="go" onClick={goNext}>
            {step + 1 >= queue.length ? '完成本轮' : '下一个'}
          </button>
        </div>
      </>
    )
  } else {
    const preview = phase === 'preview'
    const gloss = current.entry.senses?.[0]?.zh || ''
    const prompt =
      current.kind === 'conj' ? `写出${current.form.name}` : '看中文，写出日语'
    body = (
      <>
        <div className="words-body">
          <p className="meta">
            {current.entry.level}
            {current.kind === 'conj' ? ` · ${current.form.name}` : ''} · 第 {step + 1} / {queue.length} 个
          </p>
          {preview ? (
            <>
              <Headword item={current} rate={rate} />
              <p className="word-zh">{gloss}</p>
              <JaFacts item={current} reveal rate={rate} />
              <p className="spell-hint">
                {current.kind === 'conj' ? '先看词典形和这个变形，再合上默写。' : '先读一遍，记住写法，再合上默写。'}
              </p>
            </>
          ) : (
            <>
              <p className="prompt-label">{prompt}</p>
              <p className="word-zh">{gloss}</p>
              {current.kind === 'conj' ? (
                <p className="lemma" lang="ja">
                  词典形 {current.entry.word}
                  {current.entry.reading && current.entry.reading !== current.entry.word
                    ? `　${current.entry.reading}`
                    : ''}
                </p>
              ) : null}
              <JaFacts item={current} reveal={false} rate={rate} />
            </>
          )}
          <input
            id="ja-spell"
            ref={inputRef}
            className={preview ? 'spell spell-off' : 'spell'}
            lang="ja"
            value={draft}
            placeholder={preview ? '' : '在这里默写'}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label={current.kind === 'conj' ? `默写${current.form.name}` : '默写日语'}
            aria-hidden={preview}
            tabIndex={preview ? -1 : 0}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (preview) return
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === 'Enter') {
                event.preventDefault()
                confirm()
              }
            }}
          />
          {preview ? null : (
            <p className="spell-hint">
              {current.kind === 'conj'
                ? '写出这个变形。平假名也可以，空格不影响判断。'
                : '汉字、平假名、片假名都可以，空格不影响判断。'}
            </p>
          )}
        </div>
        <div className="words-bar">
          {preview ? (
            <button type="button" className="go" onClick={cover}>
              合上，默写
            </button>
          ) : (
            <>
              <button type="button" className="ghost" onClick={() => grade(false)}>
                不会
              </button>
              <button type="button" className="go" disabled={!draft.trim()} onClick={confirm}>
                确认
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  return <section className="panel words ja">{body}</section>
}
