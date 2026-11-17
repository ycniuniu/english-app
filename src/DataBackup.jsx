import { useState } from 'react'
import { applyBackup, browserStorage, buildBackup, describeBackup, downloadName, parseBackupText, undoLastImport } from './backup.js'
import { SNAPSHOT_KEY } from './storage-keys.js'
import { readStorageEntry } from './storage.js'

function saveBlob(filename, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DataBackup({ onClose }) {
  const [message, setMessage] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mode, setMode] = useState('merge')
  const [allowReplace, setAllowReplace] = useState(false)
  const [undoReady, setUndoReady] = useState(() => readStorageEntry(SNAPSHOT_KEY).status === 'ok')

  function exportData() {
    let built
    try {
      built = buildBackup((key) => localStorage.getItem(key), new Date().toISOString())
    } catch {
      setMessage('浏览器没有允许读取。没有改动任何记录。')
      return
    }
    if (!built.ok) {
      setMessage(built.error)
      return
    }
    try {
      saveBlob(downloadName(built.backup.exportedAt), JSON.stringify(built.backup, null, 2))
      setMessage('已开始下载。文件在这台设备上，预览网站读不到另一域名里的记录。')
    } catch {
      setMessage('下载没有开始。记录没有改。')
    }
  }

  function onFile(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = parseBackupText(String(reader.result || ''))
      if (!next.ok) {
        setParsed(null)
        setMessage(next.error)
        return
      }
      setParsed(next.parsed)
      setAllowReplace(false)
      setMessage('先看下面的条数。还没有写入。')
    }
    reader.onerror = () => {
      setParsed(null)
      setMessage('文件没有读出来。本机记录没有改。')
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    if (!parsed) return
    if (mode === 'replace' && !allowReplace) {
      setMessage('覆盖要再勾一次确认。现在没有写入。')
      return
    }
    const storage = browserStorage()
    const result = applyBackup({ mode, parsed, getItem: storage.getItem, setItem: storage.setItem, removeItem: storage.removeItem })
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    setUndoReady(readStorageEntry(SNAPSHOT_KEY).status === 'ok')
    setParsed(null)
    setMessage(result.changed ? `已写入 ${result.changed} 项。可以撤销刚才这一次。已有词条在合并时不会被换成备份里的复习日。` : '没有需要写入的新内容。本机记录保持原样。')
  }

  function undo() {
    const storage = browserStorage()
    const result = undoLastImport(storage.getItem, storage.setItem, storage.removeItem)
    setMessage(result.ok ? '已撤销刚才的导入，恢复到导入前的原文。' : result.error)
    if (result.ok) setUndoReady(false)
  }

  return (
    <section className="backup-sheet" role="dialog" aria-modal="true" aria-labelledby="backup-title">
      <div className="backup-bar">
        <h2 id="backup-title">学习数据</h2>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="backup-body">
        <p className="lead">
          这里导出的是 localStorage。英语单词、日语单词、翻译草稿、语速、上次打开的页，以及内置刷题和语法，都在里面。不会清空记录。个人官方资料在另一个本地数据库里，这份备份不含原卷、音频和那份进度。
        </p>
        <p className="meta">
          预览网址和 english-app-woad-ten.vercel.app 不是同一个网站，打不开彼此的本地记录。请在平时背单词的那个入口里导出：Safari 里打开的，就在 Safari 导出；主屏幕图标里用的，就在那个图标里导出。不要删除图标，也不要清除网站数据。
        </p>
        <button type="button" className="go" onClick={exportData}>
          下载备份
        </button>
        <label className="file-pick">
          选择备份文件
          <input type="file" accept="application/json,.json" onChange={onFile} />
        </label>
        {parsed ? (
          <div className="backup-preview">
            <p className="fact-label">文件里有</p>
            <ul>
              {describeBackup(parsed).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="choice-stack" role="radiogroup" aria-label="导入方式">
              <button type="button" aria-checked={mode === 'merge'} role="radio" onClick={() => setMode('merge')}>
                合并：本机已有的词条和作答保持不变，只补文件里多出来的
              </button>
              <button type="button" aria-checked={mode === 'replace'} role="radio" onClick={() => setMode('replace')}>
                覆盖：只替换文件里有的那几项，不删除文件里没有的记录
              </button>
            </div>
            {mode === 'replace' ? (
              <label className="check-line">
                <input type="checkbox" checked={allowReplace} onChange={(event) => setAllowReplace(event.target.checked)} />
                我确认用文件覆盖这些项，而不是只补缺失
              </label>
            ) : null}
            <button type="button" className="go" onClick={confirmImport}>
              确认写入
            </button>
          </div>
        ) : null}
        {undoReady ? (
          <button type="button" className="ghost" onClick={undo}>
            撤销刚才的导入
          </button>
        ) : null}
        {message ? (
          <p className="speech-note" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
