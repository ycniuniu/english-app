import { useEffect, useState } from 'react'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

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
          <h2>英语分级阅读</h2>
          <p className="lead">这一栏和日语阅读是同一套结构。现在放进来的 100 篇是日语，N5 到 N1 各 20 篇。这里不另编英语文章。</p>
        </div>
      </section>
    )
  }

  if (articleId) {
    const known = (articles || []).find((item) => item.file === `${articleId}.html`)
    const row = progress.articles[articleId]
    return (
      <section className="panel reading-article">
        <div className="reading-bar">
          <button type="button" className="ghost" onClick={onBack}>
            返回书架
          </button>
          <p className="meta">{known?.title_zh || articleId}</p>
          <button type="button" className="ghost" onClick={() => onMarkRead(articleId, !(row?.read === true))}>
            {row?.read ? '取消已读' : '标为已读'}
          </button>
        </div>
        <iframe className="reading-frame" title={known?.title_zh || articleId} src={`/ja-reading/articles/${articleId}.html`} />
      </section>
    )
  }

  const visible = (articles || []).filter((item) => item.level === level)
  return (
    <section className="panel reading">
      <div className="hub-body">
        <p className="kicker">阅读 · 日语</p>
        <h2>分级阅读</h2>
        <p className="lead">沿用原来的 100 篇和注音。打开后仍是原来的文章页。</p>
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
