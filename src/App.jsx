import { lazy, Suspense, useEffect, useState } from 'react'
import { DataBackup } from './DataBackup.jsx'
import { IosInstallTip } from './IosInstallTip.jsx'
import { JaPanel } from './JaPanel.jsx'
import { japanesePhrase } from './voice.js'
import { legacyTabFor, loadNavigation, NAV_KEY, serializeNavigation } from './navigation.js'
import { ReadingPanel } from './ReadingPanel.jsx'
import { loadReadingProgress, markReadingOpened, markReadingRead, READING_PROGRESS_KEY } from './reading-progress.js'
import { stopSpeech, useSpeech } from './speech.js'
import { readJson, readString, writeJson, writeString } from './storage.js'
import { TodayPanel } from './TodayPanel.jsx'
import { TranslatePanel } from './TranslatePanel.jsx'
import { frameForViewport, pinDocumentScroll } from './viewport.js'
import { voicePhrase } from './voice.js'
import { WordsPanel } from './WordsPanel.jsx'

const QuizPanel = lazy(() => import('./QuizPanel.jsx').then((mod) => ({ default: mod.QuizPanel })))
const GrammarPanel = lazy(() => import('./GrammarPanel.jsx').then((mod) => ({ default: mod.GrammarPanel })))

const RATES = [
  { id: 'slow', label: '慢速', value: 0.85 },
  { id: 'normal', label: '标准', value: 1 },
  { id: 'fast', label: '快速', value: 1.12 },
]

function loadRate() {
  const saved = readString('kaikou.rate.v1', 'normal')
  return RATES.some((item) => item.id === saved) ? saved : 'normal'
}

function loadLang() {
  const saved = readString('kaikou.study-lang.v1', '')
  if (saved === 'ja' || saved === 'en') return saved
  return readString('kaikou.tab.v1', '') === 'ja' ? 'ja' : 'en'
}

export function App() {
  const opened = loadNavigation(readString)
  const [tab, setTab] = useState(opened.tab)
  const [study, setStudy] = useState(opened.study)
  const [articleId, setArticleId] = useState(opened.article)
  const [translateOpen, setTranslateOpen] = useState(opened.translate === true)
  const [lang, setLang] = useState(loadLang)
  const [vocabOn, setVocabOn] = useState(() => opened.tab === 'vocab')
  const [enOn, setEnOn] = useState(() => opened.tab === 'vocab' && loadLang() === 'en')
  const [jaOn, setJaOn] = useState(() => opened.tab === 'vocab' && loadLang() === 'ja')
  const [quizOn, setQuizOn] = useState(() => opened.study === 'quiz')
  const [grammarOn, setGrammarOn] = useState(() => opened.study === 'grammar')
  const [backupOpen, setBackupOpen] = useState(false)
  const [grammarFocus, setGrammarFocus] = useState('')
  const [quizFocus, setQuizFocus] = useState('')
  const [reading, setReading] = useState(() => loadReadingProgress(readJson(READING_PROGRESS_KEY, null)))
  const [rateId, setRateId] = useState(loadRate)
  const speech = useSpeech()
  const rateItem = RATES.find((item) => item.id === rateId) ?? RATES[1]
  const rate = rateItem.value

  function cycleRate() {
    const index = RATES.findIndex((item) => item.id === rateId)
    setRateId(RATES[(index + 1) % RATES.length].id)
  }
  const fileMode = typeof window !== 'undefined' && window.location.protocol === 'file:'
  const voiceLabel =
    speech.status === 'speaking'
      ? '发音中'
      : tab === 'vocab' && lang === 'ja'
        ? japanesePhrase(speech.jaVoice)
        : voicePhrase(speech.voice)

  function selectTab(next) {
    stopSpeech()
    if (next === 'vocab') {
      setVocabOn(true)
      if (lang === 'ja') setJaOn(true)
      else setEnOn(true)
    }
    if (next !== 'today') setTranslateOpen(false)
    if (next !== 'reading') setArticleId('')
    setTab(next)
  }

  function openFromToday(next) {
    if (next === 'translate') {
      setTranslateOpen(true)
      setTab('today')
      return
    }
    if (next === 'study') {
      setStudy('hub')
      selectTab('study')
      return
    }
    selectTab(next)
  }

  function openGrammar(id) {
    setGrammarFocus(id)
    setGrammarOn(true)
    setStudy('grammar')
    setTab('study')
  }

  function openQuiz(id) {
    setQuizFocus(id)
    setQuizOn(true)
    setStudy('quiz')
    setTab('study')
  }

  function openArticle(id) {
    stopSpeech()
    setArticleId(id)
    setReading((prev) => markReadingOpened(prev, id, new Date().toISOString()))
  }

  function selectLang(next) {
    if (next === lang) return
    stopSpeech()
    if (next === 'ja') setJaOn(true)
    else setEnOn(true)
    setLang(next)
  }

  useEffect(() => {
    writeString(NAV_KEY, serializeNavigation({ tab, study, article: articleId }))
    const legacy = legacyTabFor({ tab, study, translate: translateOpen })
    if (legacy) writeString('kaikou.tab.v1', legacy)
  }, [tab, study, articleId, translateOpen])

  useEffect(() => {
    writeJson(READING_PROGRESS_KEY, reading)
  }, [reading])

  useEffect(() => {
    writeString('kaikou.rate.v1', rateId)
  }, [rateId])

  useEffect(() => {
    writeString('kaikou.study-lang.v1', lang)
  }, [lang])

  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement
    if (!viewport) return undefined
    let full = Math.max(window.innerHeight, viewport.height)
    let width = window.innerWidth
    let last = ''
    let raf = 0
    let pinnedAt = 0
    const apply = () => {
      raf = 0
      const offset = Math.max(0, viewport.offsetTop || 0)
      const height = viewport.height
      if (window.innerWidth !== width) {
        width = window.innerWidth
        full = Math.max(window.innerHeight, height + offset)
      } else if (height + offset >= full - 40) {
        full = Math.max(window.innerHeight, height + offset)
      }
      const narrow = window.matchMedia('(max-width: 839px)').matches
      if (narrow && (window.scrollX || window.scrollY) && performance.now() - pinnedAt > 300) {
        pinnedAt = performance.now()
        pinDocumentScroll()
      }
      const frame = frameForViewport({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        vvHeight: height,
        vvOffsetTop: viewport.offsetTop || 0,
        fullHeight: full,
        narrow,
      })
      const signature = `${frame.keyboard}|${frame.offsetTop}|${frame.height}|${frame.keyboardPx}`
      if (signature === last) return
      last = signature
      root.style.setProperty('--keyboard', `${frame.keyboardPx}px`)
      root.style.setProperty('--vv-offset', `${frame.offsetTop}px`)
      root.style.setProperty('--vv-height', `${frame.height}px`)
      root.toggleAttribute('data-keyboard', frame.keyboard)
    }
    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(apply)
    }
    viewport.addEventListener('resize', schedule)
    viewport.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      viewport.removeEventListener('resize', schedule)
      viewport.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
      root.removeAttribute('data-keyboard')
    }
  }, [])

  return (
    <div className="app">
      <header className="top">
        <div className="title-row">
          <div className="brand">
            <img className="app-mark" src="/niu-badge.jpg" width="40" height="40" alt="NIU 红金凤凰圆形徽章" />
            <h1>开口</h1>
          </div>
          <div className="title-tools">
            <button type="button" className="rate-cycle" onClick={cycleRate} aria-label={`语速${rateItem.label}，点击切换`}>
              {rateItem.label}
            </button>
            <button type="button" className="backup-open" onClick={() => setBackupOpen(true)}>
              备份
            </button>
            <span className="badge">{voiceLabel}</span>
          </div>
        </div>
      </header>
      {speech.status === 'speaking' ? <div className="speaking-bar" /> : null}
      {speech.message ? (
        <p className="speech-note" role="status">
          {speech.message}
        </p>
      ) : null}
      {fileMode ? (
        <p className="speech-note" role="status">
          请先运行 npm run dev，再用浏览器打开终端里的地址。
        </p>
      ) : null}
      <IosInstallTip />

      <main>
        <div className={tab === 'today' ? 'panel-wrap' : 'panel-wrap hidden'}>
          {translateOpen ? (
            <section className="panel translate-wrap">
              <div className="reading-bar">
                <button type="button" className="ghost" onClick={() => setTranslateOpen(false)}>
                  返回今日
                </button>
              </div>
              <TranslatePanel rate={rate} />
            </section>
          ) : (
            <TodayPanel lang={lang} onLang={selectLang} onOpen={openFromToday} />
          )}
        </div>
        {vocabOn ? (
          <div className={tab === 'vocab' ? 'panel-wrap words-shell' : 'panel-wrap words-shell hidden'}>
            <div className="lang-switch" role="radiogroup" aria-label="词表语言">
              <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => selectLang('en')}>
                英语
              </button>
              <span className="lang-slash" aria-hidden="true">
                /
              </span>
              <button type="button" role="radio" aria-checked={lang === 'ja'} onClick={() => selectLang('ja')}>
                日语
              </button>
            </div>
            <div className={lang === 'en' ? 'lang-stage' : 'lang-stage hidden'}>
              {enOn ? <WordsPanel rate={rate} /> : null}
            </div>
            <div className={lang === 'ja' ? 'lang-stage' : 'lang-stage hidden'}>
              {jaOn ? <JaPanel rate={rate} /> : null}
            </div>
          </div>
        ) : null}
        <div className={tab === 'study' ? 'panel-wrap' : 'panel-wrap hidden'}>
          {study === 'hub' ? (
            <section className="panel study-hub">
              <div className="hub-body">
                <p className="kicker">学习 · {lang === 'ja' ? '日语' : '英语'}</p>
                <h2>语法和刷题</h2>
                <p className="lead">做语法课，或做一套练习题。</p>
                <div className="lang-switch" role="radiogroup" aria-label="学习语言">
                  <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => selectLang('en')}>
                    英语
                  </button>
                  <span className="lang-slash" aria-hidden="true">
                    /
                  </span>
                  <button type="button" role="radio" aria-checked={lang === 'ja'} onClick={() => selectLang('ja')}>
                    日语
                  </button>
                </div>
                <button type="button" className="hub-card" onClick={() => openGrammar('')}>
                  <span className="hub-title">语法</span>
                  <span className="meta">原来的语法课和练习记录。</span>
                </button>
                <button type="button" className="hub-card" onClick={() => openQuiz('')}>
                  <span className="hub-title">刷题</span>
                  <span className="meta">原来的题库、错题和个人资料导入。</span>
                </button>
              </div>
            </section>
          ) : null}
          {grammarOn ? (
            <div className={study === 'grammar' ? 'study-stage' : 'study-stage hidden'}>
              <div className="reading-bar">
                <button type="button" className="ghost" onClick={() => setStudy('hub')}>
                  返回学习
                </button>
              </div>
              <Suspense fallback={<p className="meta study-fallback">正在打开语法…</p>}>
                <GrammarPanel focusId={grammarFocus} onFocusHandled={() => setGrammarFocus('')} onOpenQuiz={openQuiz} />
              </Suspense>
            </div>
          ) : null}
          {quizOn ? (
            <div className={study === 'quiz' ? 'study-stage' : 'study-stage hidden'}>
              <div className="reading-bar">
                <button type="button" className="ghost" onClick={() => setStudy('hub')}>
                  返回学习
                </button>
              </div>
              <Suspense fallback={<p className="meta study-fallback">正在打开刷题…</p>}>
                <QuizPanel focusId={quizFocus} onFocusHandled={() => setQuizFocus('')} onOpenGrammar={openGrammar} />
              </Suspense>
            </div>
          ) : null}
        </div>
        <div className={tab === 'reading' ? 'panel-wrap' : 'panel-wrap hidden'}>
          {articleId ? null : (
          <div className="lang-switch" role="radiogroup" aria-label="阅读语言">
            <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => selectLang('en')}>
              英语
            </button>
            <span className="lang-slash" aria-hidden="true">
              /
            </span>
            <button type="button" role="radio" aria-checked={lang === 'ja'} onClick={() => selectLang('ja')}>
              日语
            </button>
          </div>
          )}
          <ReadingPanel
            lang={lang}
            articleId={articleId}
            progress={reading}
            onOpen={openArticle}
            onBack={() => setArticleId('')}
            onMarkRead={(id, read) => setReading((prev) => markReadingRead(prev, id, read))}
          />
        </div>
      </main>
      {backupOpen ? <DataBackup onClose={() => setBackupOpen(false)} /> : null}

      <nav className={articleId && tab === 'reading' ? 'nav hidden' : 'nav'}>
        <button type="button" aria-current={tab === 'today' ? 'page' : undefined} onClick={() => selectTab('today')}>
          今日
        </button>
        <button type="button" aria-current={tab === 'vocab' ? 'page' : undefined} onClick={() => selectTab('vocab')}>
          背单词
        </button>
        <button type="button" aria-current={tab === 'study' ? 'page' : undefined} onClick={() => selectTab('study')}>
          学习
        </button>
        <button type="button" aria-current={tab === 'reading' ? 'page' : undefined} onClick={() => selectTab('reading')}>
          阅读
        </button>
      </nav>
      <p className="sr" aria-live="polite">
        {speech.status === 'speaking' ? `正在发音，第 ${speech.index + 1} 段，共 ${speech.total} 段` : ''}
      </p>
    </div>
  )
}
