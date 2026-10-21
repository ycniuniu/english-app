import { useEffect, useRef, useState } from 'react'
import { SpeakButton } from './SpeakButton.jsx'
import { parseModelReply, prepareChatRequest } from './chat-prompt.js'
import { clearChat, loadChat, saveChat } from './chat-storage.js'

function MarkedLine({ text, part }) {
  const index = text.toLowerCase().indexOf(part.toLowerCase())
  if (index < 0) return text
  const end = index + part.length
  return (
    <>
      {text.slice(0, index)}
      <mark className="chat-mark">{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  )
}

function CorrectionCard({ text, corrections }) {
  if (!corrections?.length) return null
  return (
    <article className="chat-fix">
      <p className="chat-fix-title">纠错</p>
      {corrections.map((item) => (
        <div key={`${item.part}-${item.fixed}`} className="chat-fix-item">
          <p>
            <b>错在哪</b>
            <span className="chat-fix-en">
              <MarkedLine text={text} part={item.part} />
            </span>
          </p>
          <p>
            <b>正确说法</b>
            <span className="chat-fix-en">{item.fixed}</span>
          </p>
          <p>
            <b>解释</b>
            <span>{item.why}</span>
          </p>
        </div>
      ))}
    </article>
  )
}

export function ChatPanel({ rate }) {
  const [messages, setMessages] = useState(loadChat)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef(null)
  const sending = useRef(false)

  useEffect(() => {
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, loading, error])

  async function send() {
    if (sending.current) return
    const prepared = prepareChatRequest(
      messages.map((item) => ({ role: item.role, text: item.text })),
      draft,
    )
    if (!prepared.ok) {
      setError(prepared.error)
      return
    }
    const text = prepared.messages.at(-1).content
    sending.current = true
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((item) => ({ role: item.role, text: item.text })),
          text,
        }),
      })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok) {
        setError(payload?.error || '这次没连上，请再试一次。')
        return
      }
      const parsed = parseModelReply(
        JSON.stringify({ reply: payload?.reply, corrections: payload?.corrections }),
        text,
      )
      if (!parsed.ok) {
        setError(parsed.error)
        return
      }
      const now = Date.now()
      const next = saveChat([
        ...messages,
        {
          id: `${now.toString(36)}-u`,
          role: 'user',
          text,
          at: now,
          corrections: parsed.corrections,
        },
        {
          id: `${now.toString(36)}-a`,
          role: 'assistant',
          text: parsed.reply,
          at: now + 1,
        },
      ])
      setMessages(next)
      setDraft('')
    } catch {
      setError('这次没连上，请再试一次。')
    } finally {
      sending.current = false
      setLoading(false)
    }
  }

  function clear() {
    if (sending.current) return
    clearChat()
    setMessages([])
    setError('')
  }

  return (
    <section className="panel chat-panel">
      <div className="chat-log" ref={logRef}>
        {messages.length ? (
          messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="chat-row user">
                <p className="chat-bubble">
                  <span className="sr">你说</span>
                  {message.text}
                </p>
                <CorrectionCard text={message.text} corrections={message.corrections} />
              </div>
            ) : (
              <div key={message.id} className="chat-row assistant">
                <p className="chat-bubble">
                  <span className="sr">伙伴说</span>
                  {message.text}
                </p>
                <SpeakButton text={message.text} id={`chat-${message.id}`} rate={rate} label="朗读伙伴的回复" compact />
              </div>
            ),
          )
        ) : (
          <p className="chat-empty">用中文或英文跟我聊天。英文写错了，我会指出来。</p>
        )}
      </div>
      <form
        className="chat-dock"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <label className="sr" htmlFor="chat-draft">
          跟伙伴说的话
        </label>
        <textarea
          id="chat-draft"
          value={draft}
          placeholder="用中文或英文说一句"
          rows={2}
          disabled={loading}
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="send"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
        />
        {error ? (
          <p className="chat-note" role="alert">
            {error}
          </p>
        ) : null}
        <div className="chat-actions">
          <button type="button" className="ghost" onClick={clear} disabled={loading || messages.length === 0}>
            清空
          </button>
          <button type="submit" className="go" disabled={loading}>
            {loading ? '正在回复' : '发送'}
          </button>
        </div>
      </form>
    </section>
  )
}
