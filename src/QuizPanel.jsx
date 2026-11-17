import { useEffect, useMemo, useRef, useState } from 'react'
import { EXAM_CATALOG } from './data/exam-catalog.js'
import { grammarById, passageById, questionById, questions } from './data/study-index.js'
import {
  answerQuestion,
  clearResume,
  favoriteIds,
  persistQuiz,
  questionsFor,
  readQuizStore,
  shuffleIds,
  summarizeQuestions,
  toggleFavorite,
  withResume,
  wrongIds,
} from './quiz-progress.js'
import { storageFailureMessage } from './storage.js'

function saveText(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function PassageBlock({ passageId }) {
  const passage = passageById(passageId)
  if (!passage) return null
  return (
    <article className="passage" lang={passage.id.startsWith('jlpt') ? 'ja' : 'en'}>
      <p className="fact-label">{passage.title}</p>
      {passage.paragraphs.map((paragraph) => (
        <p key={paragraph.id}>
          {passage.paragraphs.length > 1 ? <strong>{paragraph.id} </strong> : null}
          {paragraph.text}
        </p>
      ))}
      <p className="meta">{passage.note}</p>
    </article>
  )
}

export function QuizPanel({ focusId, onFocusHandled, onOpenGrammar }) {
  const [pack, setPack] = useState(() => readQuizStore())
  const [notice, setNotice] = useState('')
  const [view, setView] = useState('home')
  const [examId, setExamId] = useState('ielts')
  const [level, setLevel] = useState('')
  const [typeId, setTypeId] = useState('')
  const [order, setOrder] = useState('seq')
  const [queue, setQueue] = useState(null)
  const [choice, setChoice] = useState('')
  const [revealed, setRevealed] = useState(false)
  const exam = EXAM_CATALOG.find((item) => item.id === examId) || EXAM_CATALOG[0]
  const state = pack.state
  const current = queue ? questionById(queue.ids[queue.index]) : null

  const focusSeen = useRef('')
  useEffect(() => {
    if (!focusId || focusSeen.current === focusId) return undefined
    const question = questionById(focusId)
    if (!question) return undefined
    focusSeen.current = focusId
    setQueue({ exam: question.exam, level: '', type: '', order: 'seq', ids: [focusId], index: 0, review: true })
    setChoice('')
    setRevealed(false)
    setView('session')
    onFocusHandled()
    return undefined
  }, [focusId, onFocusHandled])

  const levelQuestions = useMemo(
    () => questionsFor(questions, { exam: exam.id, level, type: '' }),
    [exam.id, level],
  )

  if (focusId && focusId !== handledFocus && questionById(focusId)) {
    setHandledFocus(focusId)
    setQueue({ exam: questionById(focusId).exam, level: '', type: '', order: 'seq', ids: [focusId], index: 0, review: true })
    setChoice('')
    setRevealed(false)
    setView('session')
    onFocusHandled()
  }

  function remember(next) {
    setPack((prev) => ({ ...prev, state: next }))
    if (pack.status === 'corrupt' || pack.status === 'blocked') {
      setNotice(pack.status === 'corrupt' ? '刷题记录读不出来，这次只留在当前页面，没有覆盖原文件。' : '浏览器没有允许保存。单词记录没有被清掉。')
      return
    }
    const saved = persistQuiz(next)
    setNotice(saved.ok ? '' : storageFailureMessage(saved.reason))
  }

  function openExam(id) {
    setExamId(id)
    setLevel('')
    setTypeId('')
    setView('exam')
  }

  function begin(ids, meta) {
    if (!ids.length) return
    const ordered = meta.order === 'rand' ? shuffleIds(ids, (Date.now() >>> 0) || 1) : ids
    const resume = {
      exam: meta.exam,
      level: meta.level,
      type: meta.type,
      order: meta.order,
      ids: ordered,
      index: 0,
      at: new Date().toISOString(),
      review: Boolean(meta.review),
    }
    if (!resume.review) remember(withResume(state, { ...resume, at: resume.at }))
    setQueue(resume)
    setChoice('')
    setRevealed(false)
    setView('session')
  }

  function submit() {
    if (!current || !choice || revealed) return
    const at = new Date().toISOString()
    let next = answerQuestion(state, current, choice, at)
    if (queue && !queue.review) next = withResume(next, { ...queue, at })
    remember(next)
    setRevealed(true)
  }

  function goNext() {
    if (!queue) return
    const index = queue.index + 1
    if (index >= queue.ids.length) {
      if (!queue.review) remember(clearResume(pack.state))
      setQueue(null)
      setView(queue.review ? 'home' : 'exam')
      return
    }
    const resume = { ...queue, index, at: new Date().toISOString() }
    if (!queue.review) remember(withResume(pack.state, resume))
    setQueue(resume)
    setChoice('')
    setRevealed(false)
  }

  function resumeLast() {
    const saved = state.resume
    if (!saved || !saved.ids.length) return
    const ids = saved.ids.filter((id) => questionById(id))
    if (!ids.length) return
    const index = Math.min(saved.index, ids.length - 1)
    const row = state.answers[ids[index]]
    setExamId(saved.exam)
    setQueue({ ...saved, ids, index, review: false })
    setChoice(row?.choice || '')
    setRevealed(Boolean(row))
    setView('session')
  }

  let body
  if (view === 'session' && current) {
    const picked = state.answers[current.id]
    const show = revealed || Boolean(picked && queue.review && picked.choice === choice)
    const grammar = current.grammarId ? grammarById(current.grammarId) : null
    body = (
      <>
      <div className="study-body">
        <button type="button" className="text-back" onClick={() => setView('home')}>
          返回
        </button>
        <p className="meta">
          第 {queue.index + 1} / {queue.ids.length} 题 · 原创练习，不是官方真题
        </p>
        <PassageBlock passageId={current.passageId} />
        <p className="prompt">{current.prompt}</p>
        <h2 className="question-stem" lang={current.exam === 'jlpt' ? 'ja' : 'en'}>
          {current.stem}
        </h2>
        <div className="choice-stack" role="radiogroup" aria-label="选项">
          {current.options.map((option) => {
            const selected = choice === option.id
            const correct = show && option.id === current.answer
            const missed = show && selected && option.id !== current.answer
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={correct ? 'choice ok' : missed ? 'choice bad' : 'choice'}
                disabled={revealed}
                onClick={() => setChoice(option.id)}
              >
                <span>{option.id}</span>
                {option.text}
              </button>
            )
          })}
        </div>
        {revealed ? (
          <div className={state.answers[current.id]?.correct ? 'result-card ok' : 'result-card bad'}>
            <p className="result-flag">{state.answers[current.id]?.correct ? '答对了' : '这题先看解析'}</p>
            <p>正确答案：{current.options.find((option) => option.id === current.answer)?.text}</p>
            <p>{current.explanation}</p>
            {current.evidence && current.passageId ? <p className="meta">依据：{current.evidence}</p> : null}
            {grammar ? (
              <button type="button" className="ghost" onClick={() => onOpenGrammar(grammar.id)}>
                相关语法：{grammar.title}
              </button>
            ) : (
              <p className="meta">这题没有单独绑语法点。</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="words-bar">
        <button type="button" className="ghost" onClick={() => remember(toggleFavorite(state, current.id))}>
          {state.favorites[current.id] ? '已收藏' : '收藏'}
        </button>
        {revealed ? (
          <button type="button" className="go" onClick={goNext}>
            {queue.index + 1 >= queue.ids.length ? '完成' : '下一题'}
          </button>
        ) : (
          <button type="button" className="go" disabled={!choice} onClick={submit}>
            提交这题
          </button>
        )}
      </div>
    </>
    )
  } else if (view === 'exam') {
    const availableTypes = exam.types.filter((type) => !type.unimplemented && typeMatchesLevel(type, level))
    const missingTypes = exam.types.filter((type) => type.unimplemented && typeMatchesLevel(type, level))
    const pool = questionsFor(questions, { exam: exam.id, level, type: typeId })
    body = (
      <div className="study-body">
        <button type="button" className="text-back" onClick={() => setView('home')}>
          全部考试
        </button>
        <p className="kicker">{exam.name}</p>
        <h2>{exam.subtitle}</h2>
        <p className="lead">{exam.disclaimer}</p>
        <p className="meta">
          题型核对：{exam.formatChecked.checkedOn}，{exam.formatChecked.status === 'checked' ? '已对照公开说明' : '未核验'}。{exam.formatChecked.note}
        </p>
        <ul className="link-list">
          {exam.formatChecked.pages.map((page) => (
            <li key={page.url}>
              <a href={page.url} target="_blank" rel="noopener noreferrer">
                {page.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="stack-gap">
          {exam.skills.map((skill) => (
            <p key={skill.id} className={skill.status === 'unavailable' ? 'gap-note' : 'meta'}>
              {skill.name}：{skill.status === 'unavailable' ? '没有这一项。' : skill.status === 'partial' ? '只做了标明的一部分。' : '有文字练习。'}
              {skill.note}
            </p>
          ))}
        </div>
        {exam.levels.length ? (
          <div className="tracks" role="radiogroup" aria-label="等级">
            <button type="button" role="radio" aria-checked={level === ''} onClick={() => { setLevel(''); setTypeId('') }}>
              全部
            </button>
            {exam.levels.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={level === item.id} onClick={() => { setLevel(item.id); setTypeId('') }}>
                {item.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="choice-stack">
          <button type="button" aria-pressed={typeId === ''} onClick={() => setTypeId('')}>
            已有题型一起练 · {levelQuestions.length} 题
          </button>
          {availableTypes.map((type) => {
            const count = questionsFor(questions, { exam: exam.id, level, type: type.id }).length
            return (
              <button key={type.id} type="button" aria-pressed={typeId === type.id} onClick={() => setTypeId(type.id)}>
                {type.name} · {count} 题
                <small>{type.official}</small>
              </button>
            )
          })}
        </div>
        {missingTypes.length ? (
          <div className="gap-note">
            <p>这些题型现在是 0 题，不能当成已经练完：</p>
            <ul>
              {missingTypes.map((type) => (
                <li key={type.id}>
                  {type.name}：{type.official}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="tracks" role="radiogroup" aria-label="顺序">
          <button type="button" role="radio" aria-checked={order === 'seq'} onClick={() => setOrder('seq')}>
            顺序
          </button>
          <button type="button" role="radio" aria-checked={order === 'rand'} onClick={() => setOrder('rand')}>
            随机
          </button>
        </div>
        <div className="words-bar">
          <button
            type="button"
            className="go"
            disabled={pool.length === 0}
            onClick={() => begin(pool.map((item) => item.id), { exam: exam.id, level, type: typeId, order })}
          >
            开始这 {pool.length} 题
          </button>
        </div>
      </div>
    )
  } else if (view === 'wrong' || view === 'fav' || view === 'history' || view === 'stats') {
    body = <ListView view={view} state={state} onBack={() => setView('home')} onPractice={(ids) => begin(ids, { exam: '', level: '', type: '', order: 'seq', review: true })} />
  } else {
    body = (
      <div className="study-body">
        <p className="kicker">刷题</p>
        <h2>选一个考试</h2>
        <p className="lead">
          日语先按日本语能力测试 JLPT 的 N5 到 N1 来做。这是对「国内参加的日语等级考试」的理解，不是专业四级、专业八级。雅思和托福只做标明的文字题，听说写没有自动评分的部分不会假装有。
        </p>
        {state.resume && state.resume.ids && state.resume.ids.length ? (
          <button type="button" className="go" onClick={resumeLast}>
            继续上次，第 {Math.min(state.resume.index + 1, state.resume.ids.length)} / {state.resume.ids.length} 题
          </button>
        ) : null}
        <div className="exam-list">
          {EXAM_CATALOG.map((item) => {
            const rows = questions.filter((question) => question.exam === item.id)
            const summary = summarizeQuestions(state, rows)
            return (
              <button key={item.id} type="button" className="exam-card" onClick={() => openExam(item.id)}>
                <strong>{item.name}</strong>
                <span>{rows.length} 题可练</span>
                <small>
                  已做 {summary.attempted} · 做对 {summary.correct}
                </small>
              </button>
            )
          })}
        </div>
        <div className="tracks">
          <button type="button" onClick={() => setView('wrong')}>
            错题 {wrongIds(state, questions).length}
          </button>
          <button type="button" onClick={() => setView('fav')}>
            收藏 {favoriteIds(state, questions).length}
          </button>
          <button type="button" onClick={() => setView('history')}>
            历史
          </button>
          <button type="button" onClick={() => setView('stats')}>
            统计
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="panel study-panel">
      {pack.status === 'corrupt' ? (
        <p className="speech-note" role="status">
          刷题记录损坏，已停在原地，没有覆盖。
          <button type="button" onClick={() => saveText('kaikou-quiz-raw.txt', pack.raw || '', 'text/plain')}>
            下载原始文本
          </button>
        </p>
      ) : null}
      {notice ? (
        <p className="speech-note" role="status">
          {notice}
        </p>
      ) : null}
      {body}
    </section>
  )
}

function typeMatchesLevel(type, level) {
  if (!level) return true
  if (!type.levels) return true
  return type.levels.includes(level)
}

function ListView({ view, state, onBack, onPractice }) {
  const wrong = wrongIds(state, questions)
  const fav = favoriteIds(state, questions)
  const history = state.history.slice(-30).reverse()
  return (
    <div className="study-body">
      <button type="button" className="text-back" onClick={onBack}>
        返回
      </button>
      {view === 'wrong' ? (
        <>
          <h2>错题本</h2>
          <p className="lead">最近一次答错的题会留在这里。后来答对就移出。历史仍保留。</p>
          {wrong.length ? (
            <button type="button" className="go" onClick={() => onPractice(wrong)}>
              重练这 {wrong.length} 题
            </button>
          ) : (
            <p className="meta">现在没有错题。</p>
          )}
          <QuestionList ids={wrong} />
        </>
      ) : null}
      {view === 'fav' ? (
        <>
          <h2>收藏</h2>
          {fav.length ? (
            <button type="button" className="go" onClick={() => onPractice(fav)}>
              练习收藏的 {fav.length} 题
            </button>
          ) : (
            <p className="meta">还没有收藏。</p>
          )}
          <QuestionList ids={fav} />
        </>
      ) : null}
      {view === 'history' ? (
        <>
          <h2>作答历史</h2>
          <p className="meta">页面上显示最近 30 条。保存时最多留最近 300 条，更早的不会反向改单词记录。</p>
          <ul className="plain-list">
            {history.length ? history.map((row, index) => {
              const question = questionById(row.questionId)
              return (
                <li key={`${row.at}-${row.questionId}-${index}`}>
                  {row.correct ? '对' : '错'} · {question ? question.stem.slice(0, 42) : row.questionId}
                </li>
              )
            }) : <li>还没有作答。</li>}
          </ul>
        </>
      ) : null}
      {view === 'stats' ? <Stats state={state} /> : null}
    </div>
  )
}

function QuestionList({ ids }) {
  if (!ids.length) return null
  return (
    <ul className="plain-list">
      {ids.map((id) => {
        const question = questionById(id)
        if (!question) return null
        return <li key={id}>{question.stem}</li>
      })}
    </ul>
  )
}

function Stats({ state }) {
  return (
    <>
      <h2>成绩统计</h2>
      <p className="lead">只统计你在这里做过的原创题。没有雅思分数换算，也没有托福或 JLPT 的合格分。</p>
      {EXAM_CATALOG.map((exam) => {
        const rows = questions.filter((item) => item.exam === exam.id)
        const summary = summarizeQuestions(state, rows)
        return (
          <article key={exam.id} className="stat-block">
            <h3>{exam.name}</h3>
            <p>
              题库 {summary.total} · 已做 {summary.attempted} · 做对 {summary.correct} · 未做 {summary.unseen}
            </p>
            {exam.levels.map((level) => {
              const levelRows = questions.filter((item) => item.exam === exam.id && item.level === level.id)
              const levelSummary = summarizeQuestions(state, levelRows)
              return (
                <p key={level.id} className="meta">
                  {level.name}：{levelSummary.total} 题，已做 {levelSummary.attempted}，做对 {levelSummary.correct}
                </p>
              )
            })}
            {exam.types.filter((type) => type.unimplemented).map((type) => (
              <p key={type.id} className="meta">
                {type.name}：0 题，还没有，不算完成
              </p>
            ))}
          </article>
        )
      })}
    </>
  )
}
