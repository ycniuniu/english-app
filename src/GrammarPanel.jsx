import { useEffect, useMemo, useState } from 'react'
import { grammarPoints, questions } from './data/study-index.js'
import { dueGrammarIds, persistGrammar, readGrammarStore, recordDrill, recordExercise, setLearned, toggleGrammarFavorite } from './grammar-progress.js'
import { readQuizStore } from './quiz-progress.js'
import { todayKey } from './srs.js'
import { storageFailureMessage } from './storage.js'

const LEVELS = {
  en: ['A2', 'B1', 'B2'],
  ja: ['N5', 'N4', 'N3', 'N2', 'N1'],
}

export function GrammarPanel({ focusId, onOpenQuiz }) {
  const [pack, setPack] = useState(() => readGrammarStore())
  const [notice, setNotice] = useState('')
  const [lang, setLang] = useState('en')
  const [level, setLevel] = useState('')
  const [pointId, setPointId] = useState('')
  const [choice, setChoice] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [drillPick, setDrillPick] = useState({})
  const [drillShown, setDrillShown] = useState({})
  const quiz = useMemo(() => readQuizStore(), [pack])

  useEffect(() => {
    if (!focusId) return undefined
    const point = grammarPoints.find((item) => item.id === focusId)
    if (!point) return undefined
    setLang(point.lang)
    setLevel(point.level)
    setPointId(point.id)
    setChoice('')
    setShowAnswer(false)
    setDrillPick({})
    setDrillShown({})
    return undefined
  }, [focusId])

  const visible = grammarPoints.filter((item) => item.lang === lang && (level === '' || item.level === level))
  const point = grammarPoints.find((item) => item.id === pointId && item.lang === lang) || null
  const today = todayKey()
  const dueIds = dueGrammarIds(pack.state, grammarPoints, today)

  function remember(next) {
    setPack((prev) => ({ ...prev, state: next }))
    if (pack.status === 'corrupt' || pack.status === 'blocked') {
      setNotice(pack.status === 'corrupt' ? '语法记录读不出来，这次没有覆盖原文件。' : '浏览器没有允许保存。单词记录没有被清掉。')
      return
    }
    const saved = persistGrammar(next)
    setNotice(saved.ok ? '' : storageFailureMessage(saved.reason))
  }

  function openPoint(id) {
    setPointId(id)
    setChoice('')
    setShowAnswer(false)
    setDrillPick({})
    setDrillShown({})
  }

  let body
  if (point) {
    const row = pack.state.points[point.id]
    const linked = questions.filter((item) => item.grammarId === point.id && pack.state && quiz.state.wrong[item.id])
    body = (
      <>
      <div className="study-body">
        <button type="button" className="text-back" onClick={() => setPointId('')}>
          目录
        </button>
        <p className="kicker">{point.lang === 'ja' ? '日语' : '英语'} · {point.level}</p>
        <h2>{point.title}</h2>
        <p className="lead">{point.summary}</p>
        {point.rule ? <p>{point.rule}</p> : null}
        <p className="meta">{point.scope || point.levelNote}</p>
        <div className="fact-block">
          <p className="fact-label">例句</p>
          {point.examples.map((example) => (
            <div key={example.text} className="example">
              <p lang={point.lang === 'ja' ? 'ja' : 'en'}>{example.text}</p>
              {example.reading ? <p className="meta" lang="ja">{example.reading}</p> : null}
              <p className="example-zh">{example.zh}</p>
            </div>
          ))}
        </div>
        {(point.contrasts || [point.contrast]).filter(Boolean).map((item) => (
          <div key={item.wrong} className="contrast">
            <p className="fact-label">易错对比</p>
            <p className="bad-line" lang={point.lang === 'ja' ? 'ja' : 'en'}>{item.wrong}</p>
            <p className="ok-line" lang={point.lang === 'ja' ? 'ja' : 'en'}>{item.right}</p>
            <p>{item.why}</p>
          </div>
        ))}
        {point.exercises ? point.exercises.map((drill, index) => {
          const saved = row?.exercises?.[String(index)]
          const picked = drillPick[index] || ''
          const shown = Boolean(drillShown[index] || saved)
          return (
            <div key={drill.stem} className="fact-block">
              <p className="fact-label">练习 {index + 1}</p>
              <p className="question-stem" lang={point.lang === 'ja' ? 'ja' : 'en'}>{drill.stem}</p>
              <div className="choice-stack" role="radiogroup" aria-label={`练习 ${index + 1}`}>
                {drill.options.map((option) => (
                  <button key={option.id} type="button" role="radio" aria-checked={(shown ? saved?.choice : picked) === option.id} className="choice" disabled={shown} onClick={() => setDrillPick((current) => ({ ...current, [index]: option.id }))}>
                    {option.text}
                  </button>
                ))}
              </div>
              {shown ? <p className="meta">{drill.explanation}</p> : (
                <button type="button" className="go" disabled={!picked} onClick={() => {
                  remember(recordDrill(pack.state, point.id, index, picked, picked === drill.answer, new Date().toISOString(), today))
                  setDrillShown((current) => ({ ...current, [index]: true }))
                }}>提交</button>
              )}
            </div>
          )
        }) : (
        <div className="fact-block">
          <p className="fact-label">练一题</p>
          <p className="question-stem" lang={point.lang === 'ja' ? 'ja' : 'en'}>{point.exercise.stem}</p>
          <div className="choice-stack" role="radiogroup" aria-label="语法练习">
            {point.exercise.options.map((option) => (
              <button key={option.id} type="button" role="radio" aria-checked={choice === option.id} className="choice" onClick={() => setChoice(option.id)} disabled={showAnswer}>
                <span>{option.id}</span>
                {option.text}
              </button>
            ))}
          </div>
          {showAnswer ? <p className="meta">{point.exercise.explanation}</p> : null}
          {!showAnswer ? (
            <button
              type="button"
              className="go"
              disabled={!choice}
              onClick={() => {
                remember(recordExercise(pack.state, point.id, choice, choice === point.exercise.answer, new Date().toISOString(), today))
                setShowAnswer(true)
              }}
            >
              提交
            </button>
          ) : null}
        </div>
        )}
        {linked.length ? (
          <div className="gap-note">
            <p>刷题里还错着、并标了这个知识点的题：</p>
            <ul>
              {linked.map((item) => (
                <li key={item.id}>
                  <button type="button" className="text-link" onClick={() => onOpenQuiz(item.id)}>
                    {item.stem}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="meta">错题本里还没有挂到这个知识点的题。</p>
        )}
        {row?.reviewOn ? <p className="meta">复习日 {row.reviewOn}。这是语法自己的日期，不会改单词任务。</p> : null}
      </div>
      <div className="words-bar">
        <button type="button" className="ghost" onClick={() => remember(toggleGrammarFavorite(pack.state, point.id))}>
          {row?.favorite ? '已收藏' : '收藏'}
        </button>
        <button type="button" className="go" onClick={() => remember(setLearned(pack.state, point.id, !row?.learned, today))}>
          {row?.learned ? '取消学过' : '标为学过'}
        </button>
      </div>
    </>
    )
  } else {
    body = (
      <div className="study-body">
        <p className="kicker">语法学习</p>
        <h2>{lang === 'ja' ? '日语语法' : '英语语法'}</h2>
        <p className="lead">讲解、例句和练习都是原创的。等级只帮你挑选，不是考试官方大纲。</p>
        <div className="lang-switch" role="radiogroup" aria-label="语法语言">
          <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => { setLang('en'); setLevel('') }}>
            英语
          </button>
          <span className="lang-slash" aria-hidden="true">/</span>
          <button type="button" role="radio" aria-checked={lang === 'ja'} onClick={() => { setLang('ja'); setLevel('') }}>
            日语
          </button>
        </div>
        <div className="tracks" role="radiogroup" aria-label="等级">
          <button type="button" role="radio" aria-checked={level === ''} onClick={() => setLevel('')}>
            全部
          </button>
          {LEVELS[lang].map((item) => (
            <button key={item} type="button" role="radio" aria-checked={level === item} onClick={() => setLevel(item)}>
              {item}
            </button>
          ))}
        </div>
        <p className="meta">今天该复习 {dueIds.filter((id) => grammarPoints.find((item) => item.id === id && item.lang === lang)).length} 条</p>
        <div className="exam-list">
          {visible.map((item) => {
            const row = pack.state.points[item.id]
            return (
              <button key={item.id} type="button" className="exam-card" onClick={() => openPoint(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.level}</span>
                <small>{row?.learned ? '学过' : '未标学过'}{row?.favorite ? ' · 已收藏' : ''}{row?.reviewOn && row.reviewOn <= today ? ' · 到复习日' : ''}</small>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section className="panel study-panel">
      {pack.status === 'corrupt' ? <p className="speech-note">语法记录损坏，没有覆盖。</p> : null}
      {notice ? <p className="speech-note" role="status">{notice}</p> : null}
      {body}
    </section>
  )
}
