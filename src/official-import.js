import { pairJlptAnswerSheet, parseOfficialKey, sha256Hex, summarizeSections } from './official-parse.js'
import { pdfTextItems } from './pdf-items.js'

export async function previewJlptAnswerPdf(buffer, meta) {
  let extracted
  try {
    extracted = await pdfTextItems(buffer)
  } catch {
    return { ok: false, error: '这个 PDF 读不出来。没有写入。' }
  }
  const paired = pairJlptAnswerSheet(extracted.items)
  if (!paired.ok) return paired
  const hash = await sha256Hex(buffer)
  return {
    ok: true,
    hash,
    pageCount: extracted.pageCount,
    mode: paired.mode,
    sections: paired.sections,
    items: paired.items,
    unpaired: paired.unpaired,
    exam: 'jlpt',
    level: meta.level,
    edition: meta.edition,
    title: meta.title,
  }
}

export function previewOfficialKeyText(text) {
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 读不出来。没有写入。' }
  }
  return parseOfficialKey(value)
}

export async function commitOfficialPack(db, preview, files) {
  const existing = await db.findByHash(preview.hash)
  if (existing) {
    const progress = await db.getProgress(existing.id)
    return { ok: true, idempotent: true, packId: existing.id, progress }
  }
  const pack = {
    id: `${preview.exam}-${preview.hash.slice(0, 16)}`,
    hash: preview.hash,
    exam: preview.exam,
    level: preview.level || '',
    edition: preview.edition || '',
    title: preview.title,
    mode: preview.mode,
    sourceUrl: preview.sourceUrl || '',
    sections: preview.sections || summarizeSections(preview.items),
    items: preview.items,
    unpaired: preview.unpaired || [],
    verified: true,
    itemCount: preview.items.length,
    createdAt: preview.createdAt,
    updatedAt: preview.createdAt,
  }
  const assets = []
  for (const file of files) {
    const buffer = await file.buffer
    assets.push({
      id: `${pack.id}:${file.role}:${file.name}`,
      packId: pack.id,
      role: file.role,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: buffer.byteLength,
      blob: new Blob([buffer], { type: file.type || 'application/octet-stream' }),
    })
  }
  await db.writePack({ pack, assets })
  return { ok: true, idempotent: false, packId: pack.id }
}

export function answerOfficial(progress, item, choice, at) {
  const constructed = item.constructed || item.skill === 'writing' || item.skill === 'speaking'
  const correct = constructed ? null : choice === item.answer
  const answers = { ...progress.answers, [item.id]: { choice, correct, at } }
  const history = (progress.history || []).concat([{ itemId: item.id, choice, correct, at }]).slice(-300)
  const wrong = { ...(progress.wrong || {}) }
  if (correct === false) wrong[item.id] = { misses: (wrong[item.id]?.misses || 0) + 1, lastAt: at }
  else if (correct === true) delete wrong[item.id]
  return { ...progress, answers, history, wrong }
}

export function officialBackupDocument(packs, progressRows, exportedAt) {
  return {
    format: 'kaikou-official-backup',
    version: 1,
    exportedAt,
    includesAssets: false,
    note: '这是个人官方资料的进度和答案表备份，不含原卷 PDF 和音频。开口原来的 localStorage 备份也不含这份 IndexedDB。不要把这份文件传到公开仓库。',
    packs: packs.map((pack) => ({
      ...pack,
      items: pack.items,
    })),
    progress: progressRows,
  }
}

export function parseOfficialBackup(text) {
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: '备份读不出来。本地资料没有改。' }
  }
  if (!value || value.format !== 'kaikou-official-backup' || value.version !== 1 || !Array.isArray(value.packs)) {
    return { ok: false, error: '这不是官方资料备份。本地资料没有改。' }
  }
  return { ok: true, backup: value }
}
