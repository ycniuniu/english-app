import { useEffect, useMemo, useRef, useState } from 'react'
import { SpeakButton } from './SpeakButton.jsx'
import { readJson, writeJson } from './storage.js'
import { pronounceText, translateText, translationDirection } from './translate.js'

const MAX = 4000
const STORAGE_KEY = 'kaikou.translate.v1'

function loadDraft() {
  const saved = readJson(STORAGE_KEY, null)
  if (!saved || typeof saved !== 'object') return { source: '', result: '', label: '', english: false }
  return {
    source: typeof saved.source === 'string' ? saved.source.slice(0, MAX) : '',
    result: typeof saved.result === 'string' ? saved.result : '',
    label: typeof saved.label === 'string' ? saved.label : '',
    english: Boolean(saved.english),
  }
}

export function TranslatePanel({ rate }) {
  const initial = useRef(loadDraft())
  const [source, setSource] = useState(initial.current.source)
  const [result, setResult] = useState(initial.current.result)
  const [label, setLabel] = useState(initial.current.label)
  const [english, setEnglish] = useState(initial.current.english)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const direction = useMemo(() => (source.trim() ? translationDirection(source) : null), [source])

  useEffect(() => {
    writeJson(STORAGE_KEY, { source, result, label, english })
  }, [source, result, label, english])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function submit() {
    const text = source.trim()
    if (!text || loading) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    try {
      const next = await translateText(text, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!next.ok) {
        setError(next.error)
        return
      }
      setResult(next.text)
      setLabel(next.direction.label)
      setEnglish(next.direction.english)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('翻译没有连上，请检查网络后再试。')
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }

  const spoken = result ? pronounceText(source, result, english) : ''

  return (
    <section className={result ? 'panel translate has-result' : 'panel translate'}>
      <label className="sr" htmlFor="source">
        要翻译的文字
      </label>
      <textarea
        id="source"
        value={source}
        maxLength={MAX}
        placeholder="输入中文或英文，点翻译。"
        spellCheck="true"
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(event) => {
          const next = event.target.value.slice(0, MAX)
          const pasted = next.length - source.length > 80
          setSource(next)
          if (pasted) event.target.scrollTop = 0
        }}
      />
      <p className="meta">{direction ? direction.label : '输入中文或英文。翻译需要联网。'}</p>
      <button type="button" className="go" disabled={loading || !source.trim()} onClick={submit}>
        {loading ? '正在翻译…' : '翻译'}
      </button>
      {error ? (
        <p className="hint" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="translate-result">
          <p className="kicker">{label || '译文'}</p>
          <div className="word-en-row">
            <p className={english ? 'en' : 'zh'} lang={english ? 'en' : 'zh-CN'}>
              {result}
            </p>
            <SpeakButton
              text={spoken}
              id="translate"
              rate={rate}
              label={english ? '朗读译文' : '朗读英文'}
              caption="发音"
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
