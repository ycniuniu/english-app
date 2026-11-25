import { useEffect, useState } from 'react'
import { stopSpeech } from './speech.js'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function ArticleView({ id, titleZh, read, onBack, onMarkRead }) {
  const [doc, setDoc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let alive = true
    setDoc(null)
    setFailed(false)
    fetch(`/ja-reading/articles/${id}.html`)
      .then((response) => {
        if (!response.ok) throw new Error('status')
        return response.text()
      })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, 'text/html')
        const ja = parsed.querySelector('.body-ja')?.innerHTML || ''
        const zh = parsed.querySelector('.body-zh')?.innerHTML || ''
        const title = parsed.querySelector('h1')?.textContent || id
        const zhTitle = parsed.querySelector('.title-zh')?.textContent || titleZh
        let speech = ''
        try {
          speech = JSON.parse(parsed.getElementById('speech-source')?.textContent || '{}').text || ''
        } catch {
          speech = ''
        }
        if (!ja) throw new Error('empty')
        if (alive) setDoc({ ja, zh, title, zhTitle, speech })
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
      stopSpeech()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [id, titleZh])

  function playAll() {
    if (!doc?.speech || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const parts = doc.speech.split(/(?<=[。！？!?])/).map((item) => item.trim()).filter(Boolean)
    let index = 0
    const speakNext = () => {
      if (index >= parts.length) {
        setPlaying(false)
        return
      }
      const utter = new SpeechSynthesisUtterance(parts[index])
      utter.lang = 'ja-JP'
      utter.onend = () => {
        index += 1
        speakNext()
      }
      utter.onerror = () => setPlaying(false)
      window.speechSynthesis.speak(utter)
    }
    setPlaying(true)
    speakNext()
  }

  function stopAll() {
    setPlaying(false)
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    stopSpeech()
  }

  return (
    <section className="panel reading-article">
      <div className="reading-bar">
        <button type="button" className="ghost" onClick={onBack}>
          返回书架
        </button>
        <p className="meta">{doc?.zhTitle || titleZh || id}</p>
        <button type="button" className="ghost" onClick={() => onMarkRead(id, !read)}>
          {read ? '取消已读' : '标为已读'}
        </button>
      </div>
      <div className="hub-body article-body">
        {failed ? <p className="meta">这篇没有打开。</p> : null}
        {!doc && !failed ? <p className="meta">正在打开这篇…</p> : null}
        {doc ? (
          <>
            <h2 lang="ja">{doc.title}</h2>
            <div className="reading-play">
              <button type="button" onClick={playAll} disabled={playing}>
                播放全文
              </button>
              <button type="button" onClick={stopAll}>
                停止
              </button>
            </div>
            <div className="article-ja" lang="ja" dangerouslySetInnerHTML={{ __html: doc.ja }} />
            <div className="article-zh" lang="zh-CN" dangerouslySetInnerHTML={{ __html: doc.zh }} />
          </>
        ) : null}
      </div>
    </section>
  )
}

export function ReadingPanel({ lang, articleId, progress, onOpen, onBack, onMarkRead }) {
  const [articles, setArticles] = useState(null)
  const [failed, setFailed] = useState(false)
  const [level, setLevel] = useState('N5')

  useEffect(() => {
    if (lang !== 'ja') return undefined
    let alive = true
    fetch('/ja-reading/data/articles.json')
      .then((response) => {
        if (!response.ok) throw new Error('status')
        return response.json()
      })
      .then((data) => {
        if (alive) setArticles(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [lang])

  if (lang !== 'ja') {
    return (
      <section className="panel reading">
        <div className="hub-body">
          <p className="kicker">阅读 · 英语</p>
          <h2>还没有英语短文</h2>
          <p className="lead">这里不提供英语分级阅读，也不把日语短文当成英语课。要读日语短文，请切换到日语。</p>
        </div>
      </section>
    )
  }

  if (articleId) {
    const known = (articles || []).find((item) => item.file === `${articleId}.html`)
    const row = progress.articles[articleId]
    return (
      <ArticleView
        id={articleId}
        titleZh={known?.title_zh || ''}
        read={row?.read === true}
        onBack={onBack}
        onMarkRead={onMarkRead}
      />
    )
  }

  const visible = (articles || []).filter((item) => item.level === level)
  return (
    <section className="panel reading">
      <div className="hub-body">
        <p className="kicker">阅读 · 日语</p>
        <h2>分级阅读</h2>
        <p className="lead">选一篇来读。汉字上面有注音，后面有中文。</p>
        <div className="level-row" role="tablist" aria-label="阅读等级">
          {LEVELS.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={level === item} onClick={() => setLevel(item)}>
              {item}
            </button>
          ))}
        </div>
        {failed ? <p className="meta">文章列表没有载入。</p> : null}
        {!articles && !failed ? <p className="meta">正在打开目录…</p> : null}
        <ul className="reading-list">
          {visible.map((item) => {
            const id = item.file.replace(/\.html$/, '')
            const row = progress.articles[id]
            const status = row?.read ? '已读' : row?.openedAt ? '打开过' : '未读'
            return (
              <li key={id}>
                <button type="button" className="hub-card" onClick={() => onOpen(id)}>
                  <span className="hub-title" lang="ja">
                    {item.title_ja}
                  </span>
                  <span className="meta">
                    {item.title_zh} · {item.chars}字 · {status}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
