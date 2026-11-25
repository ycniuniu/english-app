export function TodayPanel({ lang, onLang, onOpen }) {
  return (
    <section className="panel today">
      <div className="hub-body">
        <p className="kicker">今日</p>
        <h2>{lang === 'ja' ? '今天学日语' : '今天学英语'}</h2>
        <p className="lead">
          {lang === 'ja'
            ? '可以先翻译一句，背几个词，再做语法，或读一篇短文。'
            : '可以先翻译一句，背几个词，再做语法或刷题。'}
        </p>
        <div className="lang-switch" role="radiogroup" aria-label="今日语言">
          <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => onLang('en')}>
            英语
          </button>
          <span className="lang-slash" aria-hidden="true">
            /
          </span>
          <button type="button" role="radio" aria-checked={lang === 'ja'} onClick={() => onLang('ja')}>
            日语
          </button>
        </div>
        <button type="button" className="hub-card" onClick={() => onOpen('translate')}>
          <span className="hub-title">翻译</span>
          <span className="meta">文字翻译和拍照翻译</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onOpen('vocab')}>
          <span className="hub-title">{lang === 'ja' ? '背日语单词' : '背英语单词'}</span>
          <span className="meta">看词、听读音，再合上默写。</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onOpen('study')}>
          <span className="hub-title">{lang === 'ja' ? '日语语法和刷题' : '英语语法和刷题'}</span>
          <span className="meta">语法课和练习题。</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onOpen('reading')}>
          <span className="hub-title">阅读</span>
          <span className="meta">{lang === 'ja' ? '读一篇带注音的日语短文。' : '英语短文还没有。日语短文要切换到日语再读。'}</span>
        </button>
      </div>
    </section>
  )
}
