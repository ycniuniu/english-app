import { useEffect, useState } from 'react'
import { SpeakIcon, TranslateIcon, WordsIcon } from './icons.jsx'
import { JaPanel } from './JaPanel.jsx'
import { japanesePhrase } from './voice.js'
import { ReaderPanel } from './ReaderPanel.jsx'
import { stopSpeech, useSpeech } from './speech.js'
import { readString, writeString } from './storage.js'
import { TranslatePanel } from './TranslatePanel.jsx'
import { voicePhrase } from './voice.js'
import { WordsPanel } from './WordsPanel.jsx'

const RATES = [
  { id: 'slow', label: '慢速', value: 0.85 },
  { id: 'normal', label: '标准', value: 1 },
  { id: 'fast', label: '快速', value: 1.12 },
]

function loadRate() {
  const saved = readString('kaikou.rate.v1', 'normal')
  return RATES.some((item) => item.id === saved) ? saved : 'normal'
}

function loadTab() {
  const saved = readString('kaikou.tab.v1', 'translate')
  if (saved === 'speak' || saved === 'read') return 'speak'
  if (saved === 'words' || saved === 'ja') return 'words'
  return 'translate'
}

function loadLang() {
  const saved = readString('kaikou.study-lang.v1', '')
  if (saved === 'ja' || saved === 'en') return saved
  return readString('kaikou.tab.v1', '') === 'ja' ? 'ja' : 'en'
}

export function App() {
  const [tab, setTab] = useState(loadTab)
  const [lang, setLang] = useState(loadLang)
  const [studyOn, setStudyOn] = useState(() => loadTab() === 'words')
  const [enOn, setEnOn] = useState(() => loadTab() === 'words' && loadLang() === 'en')
  const [jaOn, setJaOn] = useState(() => loadTab() === 'words' && loadLang() === 'ja')
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
      : tab === 'words' && lang === 'ja'
        ? japanesePhrase(speech.jaVoice)
        : voicePhrase(speech.voice)

  function selectTab(next) {
    if (next === 'words') {
      setStudyOn(true)
      if (lang === 'ja') setJaOn(true)
      else setEnOn(true)
    }
    setTab(next)
  }

  function selectLang(next) {
    if (next === lang) return
    stopSpeech()
    if (next === 'ja') setJaOn(true)
    else setEnOn(true)
    setLang(next)
  }

  useEffect(() => {
    writeString('kaikou.tab.v1', tab)
  }, [tab])

  useEffect(() => {
    writeString('kaikou.rate.v1', rateId)
  }, [rateId])

  useEffect(() => {
    writeString('kaikou.study-lang.v1', lang)
  }, [lang])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const apply = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      document.documentElement.style.setProperty('--keyboard', `${Math.round(overlap)}px`)
    }
    viewport.addEventListener('resize', apply)
    viewport.addEventListener('scroll', apply)
    apply()
    return () => {
      viewport.removeEventListener('resize', apply)
      viewport.removeEventListener('scroll', apply)
    }
  }, [])

  return (
    <div className="app">
      <header className="top">
        <div className="title-row">
          <h1>开口</h1>
          <span className="badge">{voiceLabel}</span>
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

      <main>
        <div className={tab === 'translate' ? 'panel-wrap' : 'panel-wrap hidden'}>
          <TranslatePanel rate={rate} />
        </div>
        <div className={tab === 'speak' ? 'panel-wrap' : 'panel-wrap hidden'}>
          <ReaderPanel rate={rate} rateLabel={rateItem.label} onCycleRate={cycleRate} />
        </div>
        {studyOn ? (
          <div className={tab === 'words' ? 'panel-wrap words-shell' : 'panel-wrap words-shell hidden'}>
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
      </main>

      <nav className="nav">
        <button type="button" aria-current={tab === 'translate' ? 'page' : undefined} onClick={() => selectTab('translate')}>
          <TranslateIcon />
          翻译
        </button>
        <button type="button" aria-current={tab === 'speak' ? 'page' : undefined} onClick={() => selectTab('speak')}>
          <SpeakIcon />
          发音
        </button>
        <button type="button" aria-current={tab === 'words' ? 'page' : undefined} onClick={() => selectTab('words')}>
          <WordsIcon />
          单词
        </button>
      </nav>
      <p className="sr" aria-live="polite">
        {speech.status === 'speaking' ? `正在发音，第 ${speech.index + 1} 段，共 ${speech.total} 段` : ''}
      </p>
    </div>
  )
}
