import { useEffect, useRef, useState } from 'react'
import { pinDocumentScroll } from './viewport.js'

export function focusSpellInput(id) {
  const input = document.getElementById(id)
  if (!input) return
  input.focus({ preventScroll: true })
  pinDocumentScroll()
}

export function SpellDock({
  wordKey,
  inputId = 'spell',
  label = '默写英文',
  lang = 'en',
  hint,
  onConfirm,
  onSkip,
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft('')
    const input = inputRef.current
    if (!input) return undefined
    input.focus({ preventScroll: true })
    pinDocumentScroll()
    const frame = window.requestAnimationFrame(() => pinDocumentScroll())
    return () => window.cancelAnimationFrame(frame)
  }, [wordKey])

  function confirm() {
    if (!draft.trim()) return
    inputRef.current?.blur()
    onConfirm(draft)
  }

  function skip() {
    inputRef.current?.blur()
    onSkip(draft)
  }

  return (
    <div className="spell-dock">
      <label className="sr" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        className="spell"
        lang={lang}
        value={draft}
        placeholder="在这里默写"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        inputMode="text"
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => pinDocumentScroll()}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (event.key === 'Enter') {
            event.preventDefault()
            confirm()
          }
        }}
      />
      <p className="spell-hint">{hint}</p>
      <div className="words-bar">
        <button type="button" className="ghost" onClick={skip}>
          不会
        </button>
        <button type="button" className="go" disabled={!draft.trim()} onClick={confirm}>
          确认
        </button>
      </div>
    </div>
  )
}
