export function TodayPanel({ lang, onLang, onOpen }) {
  return (
    <section className="panel today">
      <div className="hub-body">
        <p className="kicker">今日</p>
        <h2>接着学</h2>
        <p className="lead">翻译、背单词、学习和阅读分开。背单词只在自己的一栏里。</p>
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
          <span className="meta">单独的背单词。词形和例句在单词卡里。</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onOpen('study')}>
          <span className="hub-title">{lang === 'ja' ? '日语语法和刷题' : '英语语法和刷题'}</span>
          <span className="meta">不包含背单词。</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onOpen('reading')}>
          <span className="hub-title">阅读</span>
          <span className="meta">{lang === 'ja' ? '日语分级阅读，N5 到 N1 各 20 篇。' : '阅读栏里目前是同一套日语 100 篇。'}</span>
        </button>
      </div>
    </section>
  )
}
