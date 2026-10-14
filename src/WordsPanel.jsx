import { useEffect, useRef, useState } from 'react'
import { SpeakButton } from './SpeakButton.jsx'
import { speakText, stopSpeech, useSpeech } from './speech.js'
import { broadPos, speakableParts, wordPosLabels } from './word-facts.js'
import { DictField, hasText, listOrEmpty } from './word-detail.jsx'
import { readJson, writeJson } from './storage.js'
import {
  NEW_BATCH,
  STORAGE_KEY,
  answersMatch,
  buildQueue,
  cardOf,
  duePhrase,
  gradeCard,
  loadProgress,
  needsPreview,
  summarize,
  todayKey,
} from './srs.js'

function WordTap({ text, speak, id, rate }) {
  const speech = useSpeech()
  const active = speech.status === 'speaking' && speech.id === id
  return (
    <button
      type="button"
      className={active ? 'word-tap on' : 'word-tap'}
      aria-label={active ? '停止朗读' : `朗读 ${speak}`}
      onClick={() => {
        if (active) stopSpeech()
        else speakText(speak, { id, rate })
      }}
    >
      {text}
    </button>
  )
}

function SpeakableEnglish({ text, id, rate }) {
  return speakableParts(text).map((part, index) =>
    part.clickable ? (
      <WordTap key={`${index}-${part.speak}`} text={part.text} speak={part.speak} id={`${id}-w-${index}`} rate={rate} />
    ) : (
      <span key={`${index}-${part.text}`}>{part.text}</span>
    ),
  )
}

function SpokenLine({ text, zh, id, rate, label, englishClass }) {
  return (
    <div className="spoken-line">
      <div className="line-with-speak">
        <p className={englishClass} lang="en">
          <SpeakableEnglish text={text} id={id} rate={rate} />
        </p>
        <SpeakButton text={text} id={id} rate={rate} label={label} compact />
      </div>
      {zh ? <p className="example-zh">{zh}</p> : null}
    </div>
  )
}

function SenseHints({ detail }) {
  if (!detail?.senses?.length) return null
  return (
    <div className="word-facts">
      <DictField label="同一个词的几条中文">
        {detail.senses.map((sense) => (
          <div key={`${sense.pos}-${sense.zh}`} className="sense">
            <p className="sense-head">
              <span className="sense-pos">{broadPos(sense.pos)}</span>
              <span className="sense-zh">{sense.zh}</span>
            </p>
          </div>
        ))}
      </DictField>
    </div>
  )
}

function WordDetail({ detail, rate, speakId, headword, phonetic }) {
  const labels = wordPosLabels(detail?.senses)
  const senses = listOrEmpty(detail?.senses)
  const examples = listOrEmpty(
    (detail?.senses || []).flatMap((sense, senseIndex) =>
      (sense.examples || []).map(([en, zh], index) => ({ en, zh, senseIndex, index })),
    ),
  )
  const phrases = listOrEmpty(detail?.phrases)
  const synonyms = listOrEmpty(detail?.synonyms)
  const antonyms = listOrEmpty(detail?.antonyms)
  const roots = hasText(detail?.roots) ? String(detail.roots).trim() : null
  const derivatives = listOrEmpty(detail?.derivatives)
  const frequency = hasText(detail?.frequency) ? String(detail.frequency).trim() : null

  return (
    <div className="word-facts">
      <DictField label="单词">
        <div className="word-en-row">
          <p className="word-en">{headword}</p>
          <SpeakButton text={headword} id={speakId} rate={rate} label="朗读这个单词" />
        </div>
      </DictField>
      <DictField label="音标" empty={!hasText(phonetic)}>
        <p className="word-ph">{phonetic}</p>
      </DictField>
      <DictField label="词性" empty={!labels.length}>
        <p className="pos-row">
          {labels.map((label) => (
            <span key={label} className="sense-pos">
              {label}
            </span>
          ))}
        </p>
      </DictField>
      <DictField label="中文释义" empty={!senses}>
        {senses?.map((sense) => (
          <div key={`${sense.pos}-${sense.zh}`} className="sense">
            <p className="sense-head">
              <span className="sense-zh">{sense.zh}</span>
            </p>
          </div>
        ))}
      </DictField>
      <DictField label="例句" empty={!examples}>
        {examples?.map(({ en, zh, senseIndex, index }) => (
          <div key={`${senseIndex}-${index}-${en}`} className="example">
            <SpokenLine
              text={en}
              zh={zh}
              id={`${speakId}-ex-${senseIndex}-${index}`}
              rate={rate}
              label="朗读这个例句"
              englishClass="example-en"
            />
          </div>
        ))}
      </DictField>
      <DictField label="搭配" empty={!phrases}>
        <ul className="phrases">
          {phrases?.map(([en, zh], index) => (
            <li key={`${index}-${en}`}>
              <SpokenLine
                text={en}
                zh={zh}
                id={`${speakId}-ph-${index}`}
                rate={rate}
                label="朗读这个搭配"
                englishClass="phrase-en"
              />
            </li>
          ))}
        </ul>
      </DictField>
      <DictField label="同义词" empty={!synonyms}>
        <p className="fact-text">{synonyms?.join('、')}</p>
      </DictField>
      <DictField label="反义词" empty={!antonyms}>
        <p className="fact-text">{antonyms?.join('、')}</p>
      </DictField>
      <DictField label="词根词缀" empty={!roots}>
        <p className="fact-text">{roots}</p>
      </DictField>
      <DictField label="派生词" empty={!derivatives}>
        <p className="fact-text">{derivatives?.join('、')}</p>
      </DictField>
      <DictField label="词频" empty={!frequency}>
        <p className="fact-text">{frequency}</p>
      </DictField>
    </div>
  )
}

function percent(part, total) {
  if (!total || !part) return '0%'
  return `${Math.max(1.5, Math.min(100, (part / total) * 100))}%`
}

function homeCopy(stats, missRound) {
  if (stats.fresh === 0 && stats.due === 0) {
    return {
      heading: '今天没有要背的词',
      lead: '这一万个词都学过了，今天也没有到期的。明天再打开，会按间隔排进来。',
    }
  }
  if (missRound && stats.due > 0) {
    return {
      heading: `还有 ${stats.due} 个没记住`,
      lead: '这几个今天还会再出现。写对一次，就会排到后面的日子。',
    }
  }
  if (stats.due > 0) {
    return {
      heading: `今天有 ${stats.due} 个要复习`,
      lead: '先写到期的词，再认几个新词。写对了间隔拉长，写错了留在今天。',
    }
  }
  if (stats.learned > 0) {
    return {
      heading: '今天的复习做完了',
      lead: '到期的都写过了。要是还想继续，可以再认一批新词。',
    }
  }
  return {
    heading: '从最常用的词开始',
    lead: '新词先看英文和中文。合上以后，只留中文，把英文写出来。写对了，下次隔得更久；写错了，今天还会再遇到。',
  }
}

export function WordsPanel({ rate }) {
  const [words, setWords] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [cards, setCards] = useState(() => loadProgress(readJson(STORAGE_KEY, null)).cards)
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
    import('./data/ielts-words.js')
      .then((mod) => {
        if (!alive) return
        setWords(
          (mod.words || []).map((row, id) => ({
            id,
            word: row[0],
            zh: row[1],
            phonetic: row[2] || '',
            detail: (mod.details || [])[id] || null,
          })),
        )
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [attempt])

  useEffect(() => {
    writeJson(STORAGE_KEY, { cards })
  }, [cards])

  useEffect(() => {
    if (phase === 'recall') inputRef.current?.focus()
  }, [phase, step])

  const total = words?.length ?? 0
  const stats = summarize(cards, total, today)
  const current = queue && words ? words[queue[step]] : null

  function openRound(newBatch) {
    if (!words) return
    const next = buildQueue(cards, words.length, today, newBatch)
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
    const graded = gradeCard(cardOf(cards, current.id), correct, today)
    setCards((prev) => ({ ...prev, [String(current.id)]: graded }))
    setTyped(draft)
    setResult({ correct, card: graded })
    setPhase('result')
    stopSpeech()
  }

  function confirm() {
    if (!current || !draft.trim()) return
    grade(answersMatch(draft, current.word))
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
  let primary = null
  let secondary = null
  if (words) {
    if (missRound && stats.due > 0) {
      primary = { label: `再复习错词 ${stats.due} 个`, batch: 0 }
      if (freshBatch > 0) secondary = { label: `再学 ${freshBatch} 个新词`, batch: freshBatch }
    } else if (stats.due > 0 && freshBatch > 0) {
      primary = { label: `开始今天的 ${stats.due + freshBatch} 个`, batch: freshBatch }
    } else if (stats.due > 0) {
      primary = { label: `复习今天的 ${stats.due} 个`, batch: 0 }
    } else if (freshBatch > 0) {
      primary = { label: `学习 ${freshBatch} 个新词`, batch: freshBatch }
    }
  }

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
    const copy = homeCopy(stats, missRound)
    body = (
      <>
        <div className="words-body">
          <p className="kicker">单词记忆</p>
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
          <p className="meta">
            共 {stats.total.toLocaleString('zh-CN')}{' '}
            词：雅思词汇在前，后面用高频的六级、托福、GRE 和牛津词汇补足。词表来自 ECDICT。英语进度和日语分开，只存在这台设备上。
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
    body = (
      <>
        <div className="words-body">
          <p className="meta">
            第 {step + 1} / {queue.length} 个
          </p>
          <div className={result.correct ? 'result-card ok' : 'result-card bad'}>
            <p className="result-flag">{result.correct ? '记住了' : '先记下这个拼法'}</p>
            <WordDetail
              detail={current.detail}
              rate={rate}
              speakId={`card-${current.id}`}
              headword={current.word}
              phonetic={current.phonetic}
            />
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
    body = (
      <>
        <div className="words-body">
          <p className="meta">
            第 {step + 1} / {queue.length} 个
          </p>
          {preview ? (
            <>
              <WordDetail
                detail={current.detail}
                rate={rate}
                speakId={`card-${current.id}`}
                headword={current.word}
                phonetic={current.phonetic}
              />
              <p className="spell-hint">先读一遍，记住拼法，再合上默写。</p>
            </>
          ) : (
            <>
              <p className="prompt-label">看中文，写出英文</p>
              <p className="word-zh">{current.zh}</p>
              <SenseHints detail={current.detail} />
            </>
          )}
          <input
            id="spell"
            ref={inputRef}
            className={preview ? 'spell spell-off' : 'spell'}
            value={draft}
            placeholder={preview ? '' : '在这里默写'}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="默写英文"
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
          {preview ? null : <p className="spell-hint">大小写和首尾空格不影响判断。</p>}
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

  return <section className="panel words">{body}</section>
}
