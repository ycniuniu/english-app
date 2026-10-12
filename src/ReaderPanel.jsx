import { useEffect, useMemo, useState } from 'react'
import { speakText, stopSpeech, useSpeech } from './speech.js'
import { readString, writeString } from './storage.js'
import { chunkForSpeech, mostlyChinese } from './text.js'
import { voicePhrase } from './voice.js'

const MAX = 20000

export function ReaderPanel({ rate, rateLabel, onCycleRate }) {
  const [text, setText] = useState(() => readString('kaikou.read.v1', ''))
  const speech = useSpeech()
  const speaking = speech.status === 'speaking' && speech.id === 'reader'
  const chunks = useMemo(() => chunkForSpeech(text), [text])

  useEffect(() => {
    writeString('kaikou.read.v1', text)
  }, [text])

  const count = text.trim().length
  let meta = '粘贴英文后即可发音'
  if (count) {
    meta = `${count.toLocaleString('zh-CN')} 字符 · 分 ${chunks.length} 段发音`
  }

  return (
    <section className="panel reader">
      <label className="sr" htmlFor="passage">
        英文文本
      </label>
      <textarea
        id="passage"
        value={text}
        maxLength={MAX}
        placeholder="把英文粘贴到这里。点下面的按钮，用美式发音读出来。"
        spellCheck="true"
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(event) => {
          const next = event.target.value.slice(0, MAX)
          const pasted = next.length - text.length > 80
          setText(next)
          if (pasted) event.target.scrollTop = 0
        }}
      />
      <div className="reader-rate">
        <p className="meta" aria-live="polite">
          {speaking ? `正在读第 ${speech.index + 1} / ${speech.total} 段` : meta}
          <span> · {voicePhrase(speech.voice)}</span>
          {speech.voiceName ? <span className="voice-name"> · {speech.voiceName}</span> : null}
        </p>
        <button type="button" className="rate-cycle" onClick={onCycleRate} aria-label={`语速${rateLabel}，点击切换`}>
          {rateLabel}
        </button>
      </div>
      {mostlyChinese(text) ? (
        <p className="hint">这段汉字比较多，英语语音读汉字会不准。</p>
      ) : null}
      {speaking && speech.chunk ? (
        <div className="now">
          <b>正在读</b>
          <p lang="en">{speech.chunk}</p>
        </div>
      ) : null}
      <button
        type="button"
        className={speaking ? 'go hot' : 'go'}
        disabled={!speaking && !text.trim()}
        onClick={() => {
          if (speaking) stopSpeech()
          else speakText(text, { id: 'reader', rate })
        }}
      >
        {speaking ? '停止发音' : '开始发音'}
      </button>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          if (speaking) stopSpeech()
          setText('')
        }}
      >
        清空
      </button>
    </section>
  )
}
