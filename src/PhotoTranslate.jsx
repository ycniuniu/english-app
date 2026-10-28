import { useRef, useState } from 'react'
import { formatMegabytes, ocrModelBytes, ocrRuntimeBytes } from './ocr-models.js'
import { ocrFailureMessage } from './ocr-text.js'
import { translatePhotoLines } from './photo-translate.js'

export function PhotoTranslate() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)

  async function onPick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setError('')
    setRows([])
    setStatus('正在准备识别…')
    try {
      const { recognizePhoto } = await import('./ocr-runtime.js')
      const lines = await recognizePhoto(file, {
        signal: controller.signal,
        onProgress(progress) {
          if (controller.signal.aborted) return
          if (progress.phase === 'download') setStatus(`正在下载识别模型… ${progress.label}`)
          else setStatus('正在识别文字…')
        },
      })
      if (controller.signal.aborted) return
      setStatus('正在逐行翻译…')
      const translated = await translatePhotoLines(lines, { signal: controller.signal })
      if (controller.signal.aborted) return
      setRows(translated.rows)
      if (!translated.ok) {
        setError(translated.error)
        setStatus('')
        return
      }
      setStatus('')
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return
      setError(ocrFailureMessage(err))
      setStatus('')
    } finally {
      if (abortRef.current === controller) setBusy(false)
    }
  }

  return (
    <div className="photo-block">
      <p className="kicker">拍照翻译</p>
      <div className="photo-actions">
        <label className="photo-pick" aria-disabled={busy ? 'true' : undefined}>
          拍照
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="拍照"
            disabled={busy}
            onChange={onPick}
          />
        </label>
        <label className="photo-pick" aria-disabled={busy ? 'true' : undefined}>
          选图
          <input type="file" accept="image/*" aria-label="选图" disabled={busy} onChange={onPick} />
        </label>
      </div>
      <p className="photo-note">
        文字在手机里识别，每一行下面是中文。首次会下载 {formatMegabytes(ocrModelBytes())} 识别模型，并加载 {formatMegabytes(ocrRuntimeBytes())} 运行组件，之后缓存在手机里。翻译仍要联网。
      </p>
      {status ? (
        <p className="meta" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="hint" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length ? (
        <ol className="photo-lines">
          {rows.map((row, index) => (
            <li className="photo-line" key={`${index}-${row.source}`}>
              <p className="source" lang={row.script === 'ja' ? 'ja' : 'en'}>
                {row.source}
              </p>
              <p className="zh" lang="zh-CN">
                {row.zh}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
