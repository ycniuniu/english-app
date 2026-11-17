import { useEffect, useRef, useState } from 'react'
import { OFFICIAL_SOURCES } from './data/official-sources.js'
import { contentCounts } from './data/study-index.js'
import { openOfficialDb, storageMessage } from './official-db.js'
import {
  answerOfficial,
  commitOfficialPack,
  officialBackupDocument,
  parseOfficialBackup,
  previewJlptAnswerPdf,
  previewOfficialKeyText,
} from './official-import.js'
import { parseOfficialCsv } from './official-parse.js'
import { sha256Hex } from './official-parse.js'
import { renderPdfPage } from './pdf-items.js'

function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function OfficialPanel() {
  const [db, setDb] = useState(null)
  const [dbError, setDbError] = useState('')
  const [packs, setPacks] = useState([])
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const [files, setFiles] = useState([])
  const [level, setLevel] = useState('N5')
  const [edition, setEdition] = useState('2018')
  const [activeId, setActiveId] = useState('')
  const [pendingDelete, setPendingDelete] = useState('')

  async function refresh(database) {
    setPacks(await database.listPacks())
  }

  useEffect(() => {
    let alive = true
    openOfficialDb()
      .then(async (database) => {
        if (!alive) {
          database.close()
          return
        }
        setDb(database)
        await refresh(database)
      })
      .catch((error) => {
        if (alive) setDbError(storageMessage(error))
      })
    return () => {
      alive = false
    }
  }, [])

  async function onAnswerPdf(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const buffer = await file.arrayBuffer()
    const next = await previewJlptAnswerPdf(buffer, {
      level,
      edition,
      title: `JLPT ${edition} ${level} 正答表`,
    })
    if (!next.ok) {
      setPreview(null)
      setNotice(next.error)
      return
    }
    setPreview({ ...next, sourceUrl: 'https://www.jlpt.jp/e/samples/sampleindex.html', createdAt: new Date().toISOString() })
    setFiles([{ role: 'answer-pdf', name: file.name, type: file.type || 'application/pdf', buffer }])
    setNotice(next.unpaired.length ? `有 ${next.unpaired.length} 行没配上，这些题不会进入练习。` : '配对完成。请对照正答表再确认写入。')
  }

  async function onKeyJson(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    const parsed = previewOfficialKeyText(text)
    if (!parsed.ok) {
      setNotice(parsed.error)
      return
    }
    const buffer = new TextEncoder().encode(text)
    const hash = await sha256Hex(buffer)
    const source = parsed.source || {}
    setPreview({
      ok: true,
      hash,
      mode: parsed.mode,
      exam: parsed.exam,
      level: source.level || '',
      edition: source.edition || '',
      title: source.title || file.name,
      sourceUrl: source.url || '',
      sections: parsed.sections,
      items: parsed.items,
      unpaired: [],
      createdAt: new Date().toISOString(),
    })
    setFiles([{ role: 'answer-json', name: file.name, type: 'application/json', buffer }])
    setNotice('JSON 通过校验。还没有写入。')
  }

  async function onCsv(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    const parsed = parseOfficialCsv(text)
    if (!parsed.ok) {
      setPreview(null)
      setNotice(parsed.error)
      return
    }
    const buffer = new TextEncoder().encode(text)
    const hash = await sha256Hex(buffer)
    setPreview({
      ok: true,
      hash,
      mode: 'csv-key',
      exam: parsed.exam,
      level: '',
      edition: 'csv',
      title: file.name,
      sourceUrl: '',
      sections: parsed.sections,
      items: parsed.items,
      unpaired: [],
      createdAt: new Date().toISOString(),
    })
    setFiles([{ role: 'answer-csv', name: file.name, type: 'text/csv', buffer }])
    setNotice('CSV 通过校验。还没有写入。题目只放在这台浏览器里。')
  }

  async function addExtra(event, role) {
    const picked = [...(event.target.files || [])]
    event.target.value = ''
    const extras = []
    for (const file of picked) {
      extras.push({ role, name: file.name, type: file.type || '', buffer: await file.arrayBuffer() })
    }
    setFiles((current) => current.concat(extras))
  }

  async function confirmImport() {
    if (!db || !preview) return
    try {
      const result = await commitOfficialPack(db, preview, files)
      setPreview(null)
      setFiles([])
      await refresh(db)
      setNotice(result.idempotent ? '这份资料以前导入过，进度还留着，没有另存一份。' : `已放进这台浏览器。可练 ${preview.items.length} 题。`)
      setActiveId(result.packId)
    } catch (error) {
      setNotice(storageMessage(error))
    }
  }

  async function removePack(id) {
    if (!db) return
    try {
      await db.deletePack(id)
      if (activeId === id) setActiveId('')
      setPendingDelete('')
      await refresh(db)
      setNotice('这份资料已从本机数据库删除。单词记录没有动。')
    } catch (error) {
      setNotice(storageMessage(error))
    }
  }

  async function exportProgress() {
    if (!db) return
    const progress = []
    for (const pack of packs) progress.push(await db.getProgress(pack.id))
    downloadText(`kaikou-official-${Date.now()}.json`, JSON.stringify(officialBackupDocument(packs, progress, new Date().toISOString()), null, 2))
    setNotice('已下载资料进度。这份文件不含原卷和音频，也不是单词备份。不要传到公开仓库。')
  }

  async function restoreProgress(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file || !db) return
    const parsed = parseOfficialBackup(await file.text())
    if (!parsed.ok) {
      setNotice(parsed.error)
      return
    }
    let added = 0
    for (const pack of parsed.backup.packs) {
      if (!pack || !pack.hash || !Array.isArray(pack.items)) {
        setNotice('备份里有一份资料不完整。已停止，没有继续写。')
        return
      }
      const existing = await db.findByHash(pack.hash)
      if (!existing) {
        await db.writePack({ pack, assets: [] })
        added += 1
      }
      const saved = (parsed.backup.progress || []).find((row) => row.packId === pack.id)
      if (!saved) continue
      const targetId = existing ? existing.id : pack.id
      const local = await db.getProgress(targetId)
      await db.putProgress({
        ...local,
        packId: targetId,
        answers: { ...(saved.answers || {}), ...(local.answers || {}) },
        wrong: { ...(saved.wrong || {}), ...(local.wrong || {}) },
        resume: local.resume || saved.resume || null,
        history: local.history?.length ? local.history : saved.history || [],
      })
    }
    await refresh(db)
    setNotice(added ? `恢复了 ${added} 份资料的题目表和进度。原卷需要重新选择文件。` : '这些资料已经在本机，只补了缺失的进度。')
  }

  const importedCount = packs.reduce((sum, pack) => sum + (pack.itemCount || 0), 0)
  const active = packs.find((pack) => pack.id === activeId) || null

  return (
    <div className="official-block">
      <h2>个人官方资料</h2>
      <p className="lead">
        内置原创是 {contentCounts().questions} 题，和这里分开计数。链接只说明你可以从哪里自己下载，不算已经能练。已导入、并且通过校验的才计入可练题量。当前已导入 {importedCount} 题。
      </p>
      <p className="meta">个人自用不能当成无条件免责。文件只留在这台浏览器，不上传。听力里的第三方作品尤其不要再公开。</p>
      {dbError ? <p className="speech-note">{dbError}</p> : null}
      {notice ? <p className="speech-note" role="status">{notice}</p> : null}
      {active ? (
        <PackPractice db={db} pack={active} onBack={() => setActiveId('')} onNotice={setNotice} />
      ) : (
        <>
          {OFFICIAL_SOURCES.map((source) => (
            <article key={source.id} className="stat-block">
              <h3>{source.name}</h3>
              <p>{source.summary}</p>
              <p className="fact-label">链接可用，尚未导入</p>
              <ul className="plain-list">
                {source.linkAvailable.map((item) => (
                  <li key={item.id}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                    <span className="meta"> {item.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="fact-label">现在能导入的格式</p>
              <ul className="plain-list">
                {source.supported.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="fact-label">做不到的</p>
              <ul className="plain-list">
                {source.unsupported.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="meta">{source.copyright}</p>
            </article>
          ))}
          <div className="tracks">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
              <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)}>{item}</button>
            ))}
          </div>
          <div className="tracks">
            <button type="button" aria-pressed={edition === '2012'} onClick={() => setEdition('2012')}>2012 节选</button>
            <button type="button" aria-pressed={edition === '2018'} onClick={() => setEdition('2018')}>2018 节选</button>
          </div>
          <label className="file-pick">
            导入 JLPT 正答表 PDF
            <input type="file" accept="application/pdf,.pdf" onChange={onAnswerPdf} />
          </label>
          <label className="file-pick">
            或导入校验过的 JSON 题库
            <input type="file" accept="application/json,.json" onChange={onKeyJson} />
          </label>
          <label className="file-pick">
            或导入 CSV 题库
            <input aria-label="导入 CSV 题库" type="file" accept="text/csv,.csv" onChange={onCsv} />
          </label>
          <p className="meta">
            CSV 表头用 exam,id,section,skill,stem,choice1,choice2,choice3,choice4,answer,explanation,reference。示例题只在仓库说明 docs/official-import-template.md，不是官方题。
          </p>
          {preview ? (
            <div className="backup-preview">
              <p>将写入 {preview.items.length} 题。模式：{preview.mode === 'pdf-answer-sheet' ? '对照原卷作答，不是自动抽题。' : preview.mode === 'csv-key' ? 'CSV 题库。' : 'JSON 答题卡。'}</p>
              <ul className="plain-list">
                {preview.sections.map((section) => (
                  <li key={section.id}>{section.label} {section.count} 题</li>
                ))}
              </ul>
              {preview.unpaired?.length ? <p>未配对 {preview.unpaired.length} 行，已排除。</p> : <p>题号和答案都配上了。</p>}
              <label className="file-pick">
                可选：原卷 PDF，只用于翻页
                <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => addExtra(event, 'paper')} />
              </label>
              <label className="file-pick">
                可选：本地听力音频
                <input type="file" accept="audio/*,.mp3" multiple onChange={(event) => addExtra(event, 'audio')} />
              </label>
              <p className="meta">已选附加文件 {files.filter((file) => file.role !== 'answer-pdf' && file.role !== 'answer-json').length} 个。大文件可能装不下，失败时不会删掉已有资料。</p>
              <button type="button" className="go" onClick={confirmImport}>确认写入这台浏览器</button>
            </div>
          ) : null}
          <h3>已导入</h3>
          {packs.length ? packs.map((pack) => (
            <article key={pack.id} className="exam-card">
              <strong>{pack.title}</strong>
              <span>{pack.itemCount} 题 · {pack.mode === 'pdf-answer-sheet' ? '原卷答题卡' : pack.mode === 'csv-key' ? 'CSV' : 'JSON'}</span>
              <small>{pack.level} {pack.edition}</small>
              <button type="button" className="go" onClick={() => setActiveId(pack.id)}>继续练</button>
              {pendingDelete === pack.id ? (
                <button type="button" className="ghost" onClick={() => removePack(pack.id)}>确认删除这份资料</button>
              ) : (
                <button type="button" className="ghost" onClick={() => setPendingDelete(pack.id)}>删除</button>
              )}
            </article>
          )) : <p className="meta">还没有导入。上面的链接不是题量。</p>}
          <button type="button" className="ghost" onClick={exportProgress}>导出资料进度（不含原卷）</button>
          <label className="file-pick">
            恢复资料进度
            <input type="file" accept="application/json,.json" onChange={restoreProgress} />
          </label>
        </>
      )}
    </div>
  )
}

function PackPractice({ db, pack, onBack, onNotice }) {
  const [progress, setProgress] = useState(null)
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState('')
  const [draft, setDraft] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [assets, setAssets] = useState([])
  const [paperId, setPaperId] = useState('')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [wrongOnly, setWrongOnly] = useState(false)
  const [audioUrls, setAudioUrls] = useState([])
  const canvasRef = useRef(null)

  useEffect(() => {
    let alive = true
    Promise.all([db.getProgress(pack.id), db.assetsFor(pack.id)]).then(([saved, rows]) => {
      if (!alive) return
      setProgress(saved)
      setAssets(rows)
      const papers = rows.filter((row) => row.role === 'paper')
      setPaperId(papers[0]?.id || '')
      const urls = rows.filter((row) => row.role === 'audio').map((row) => ({
        id: row.id,
        name: row.name,
        url: URL.createObjectURL(row.blob),
      }))
      setAudioUrls(urls)
      if (saved.resume?.index) setIndex(saved.resume.index)
    })
    return () => {
      alive = false
      setAudioUrls((current) => {
        for (const row of current) URL.revokeObjectURL(row.url)
        return []
      })
    }
  }, [db, pack.id])

  const queue = wrongOnly ? pack.items.filter((item) => progress?.wrong?.[item.id]) : pack.items
  const item = queue[index] || null
  const paper = assets.find((row) => row.id === paperId) || null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!paper || !canvas) return undefined
    let alive = true
    paper.blob.arrayBuffer().then((buffer) => {
      if (!alive) return null
      return renderPdfPage(buffer, page, canvas).then((result) => {
        if (alive) setPageCount(result.pageCount)
      })
    }).catch(() => onNotice('这一页原卷没有画出来。答案表还在，没有删。'))
    return () => {
      alive = false
    }
  }, [paper, page, onNotice])

  async function save(next, resumeIndex) {
    const withResume = { ...next, resume: { index: resumeIndex, at: new Date().toISOString() } }
    setProgress(withResume)
    try {
      await db.putProgress(withResume)
    } catch (error) {
      onNotice(storageMessage(error))
    }
  }

  async function submit() {
    if (!item || !progress) return
    const at = new Date().toISOString()
    if (item.constructed || item.skill === 'writing' || item.skill === 'speaking') {
      await save(answerOfficial(progress, item, draft, at), index)
      setRevealed(true)
      return
    }
    if (!choice) return
    await save(answerOfficial(progress, item, choice, at), index)
    setRevealed(true)
  }

  function go(nextIndex) {
    const bounded = Math.max(0, Math.min(queue.length - 1, nextIndex))
    setIndex(bounded)
    setChoice('')
    setDraft('')
    setRevealed(Boolean(progress?.answers?.[queue[bounded]?.id]))
    if (progress) save(progress, bounded)
  }

  if (!progress) return <p className="meta">正在打开这份资料…</p>
  if (!item) {
    return (
      <div>
        <button type="button" className="text-back" onClick={onBack}>返回资料</button>
        <p>{wrongOnly ? '错题已经做完，或还没有错题。' : '这份资料没有题。'}</p>
        <button type="button" onClick={() => { setWrongOnly(false); setIndex(0) }}>看全部</button>
      </div>
    )
  }
  const saved = progress.answers[item.id]
  const constructed = item.constructed || item.skill === 'writing' || item.skill === 'speaking'
  const audios = audioUrls

  return (
    <div>
      <button type="button" className="text-back" onClick={onBack}>返回资料</button>
      <p className="meta">第 {index + 1} / {queue.length} · {item.sectionLabel} · 对照原卷，不是从 PDF 抽出的题干</p>
      <div className="tracks">
        <button type="button" onClick={() => { setWrongOnly(false); setIndex(0) }}>全部</button>
        <button type="button" onClick={() => { setWrongOnly(true); setIndex(0); setRevealed(false) }}>错题 {Object.keys(progress.wrong || {}).length}</button>
      </div>
      {assets.some((row) => row.role === 'paper') ? (
        <div>
          <div className="tracks">
            {assets.filter((row) => row.role === 'paper').map((row) => (
              <button key={row.id} type="button" aria-pressed={paperId === row.id} onClick={() => { setPaperId(row.id); setPage(1) }}>{row.name}</button>
            ))}
          </div>
          <div className="pdf-frame">
            <canvas ref={canvasRef} />
          </div>
          <div className="tracks">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
            <span className="meta">{page} / {pageCount}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button>
          </div>
        </div>
      ) : <p className="gap-note">还没有原卷 PDF。你仍可以按题号作答，打开自己保存的卷子对照。这不是自动抽题。</p>}
      <h3>题号 {String(item.no)}</h3>
      {item.stem ? <p className="question-stem">{item.stem}</p> : null}
      {item.skill === 'listening' ? <p className="meta">听力要看原卷或听你自己导入的音频。没有音频文件时，这里不播放。</p> : null}
      {audios.map((row) => <audio key={row.id} controls src={row.url} />)}
      {constructed ? (
        <>
          <p>这里只保存你的答案。不自动评分，也不换算考试分数。</p>
          {item.reference ? <p className="meta">你导入的参考：{item.reference}</p> : <p className="meta">没有导入参考材料。</p>}
          <textarea className="official-draft" value={revealed ? saved?.choice || draft : draft} onChange={(event) => setDraft(event.target.value)} readOnly={revealed} />
        </>
      ) : (
        <div className="choice-stack" role="radiogroup" aria-label="选项编号">
          {item.choices.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={(revealed ? saved?.choice : choice) === option} className="choice" disabled={revealed} onClick={() => setChoice(option)}>
              {option}
            </button>
          ))}
        </div>
      )}
      {revealed && !constructed ? (
        <div className={saved?.correct ? 'result-card ok' : 'result-card bad'}>
          <p className="result-flag">{saved?.correct ? '和官方答案一致' : '和官方答案不同'}</p>
          <p>官方答案编号：{item.answer || '这份表没有给出'}</p>
          <p>{item.explanation ? item.explanation : '官方答案表没有写解析。这里不另外编一条解析。'}</p>
        </div>
      ) : null}
      {revealed && constructed ? <p className="meta">已保存在这台浏览器。没有分数。</p> : null}
      <div className="words-bar">
        {!revealed ? <button type="button" className="go" disabled={constructed ? !draft.trim() : !choice} onClick={submit}>提交这题</button> : null}
        <button type="button" className="ghost" disabled={index <= 0} onClick={() => go(index - 1)}>上一题</button>
        <button type="button" className="go" disabled={index + 1 >= queue.length} onClick={() => go(index + 1)}>下一题</button>
      </div>
    </div>
  )
}
