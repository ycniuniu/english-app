import assert from 'node:assert/strict'
import test from 'node:test'
import { WORD_KEY } from '../src/storage-keys.js'
import { createMemoryOfficialDb } from '../src/official-db.js'
import { answerOfficial, commitOfficialPack, parseOfficialBackup, previewOfficialKeyText } from '../src/official-import.js'
import { pairJlptAnswerSheet, sha256Hex } from '../src/official-parse.js'

test('JLPT answer rows pair by x and drop the listening example', () => {
  const paired = pairJlptAnswerSheet([
    { page: 1, x: 60, y: 500, text: '●言語知識（文字・語彙）' },
    { page: 1, x: 72, y: 460, text: '問題 1' },
    { page: 1, x: 120, y: 460, text: '1' },
    { page: 1, x: 160, y: 460, text: '2' },
    { page: 1, x: 120, y: 438, text: '4' },
    { page: 1, x: 160, y: 438, text: '1' },
    { page: 1, x: 60, y: 300, text: '●聴解' },
    { page: 1, x: 72, y: 260, text: '問題 1' },
    { page: 1, x: 120, y: 260, text: '例' },
    { page: 1, x: 160, y: 260, text: '1' },
    { page: 1, x: 120, y: 238, text: '３' },
    { page: 1, x: 160, y: 238, text: '２' },
  ])
  assert.equal(paired.ok, true)
  assert.equal(paired.unpaired.length, 0)
  assert.deepEqual(paired.items.map((item) => [item.id, item.answer]), [
    ['vocabulary:1:1', '4'],
    ['vocabulary:1:2', '1'],
    ['listening:1:1', '2'],
  ])
  assert.equal(paired.items.every((item) => item.explanation === ''), true)
})

test('a broken JSON key is refused before any database write', async () => {
  const db = createMemoryOfficialDb({
    packs: [{ id: 'keep', hash: 'abc', title: '已有', items: [{ id: '1', answer: '1' }], itemCount: 1 }],
  })
  const bad = previewOfficialKeyText('{')
  assert.equal(bad.ok, false)
  const mismatch = previewOfficialKeyText(JSON.stringify({
    format: 'kaikou-official-key',
    version: 1,
    exam: 'ielts',
    items: [{ id: '1', skill: 'reading', choices: ['A', 'B'], answer: 'C' }],
  }))
  assert.equal(mismatch.ok, false)
  assert.equal((await db.listPacks()).length, 1)
})

test('the same official file imports once and a failed write keeps the old pack', async () => {
  const store = { [WORD_KEY]: '{"cards":{"3":{"due":"2026-12-01"}}}' }
  globalThis.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: () => {
      throw new Error('word storage should not be written')
    },
    removeItem: () => {
      throw new Error('word storage should not be removed')
    },
  }
  const db = createMemoryOfficialDb()
  const text = JSON.stringify({
    format: 'kaikou-official-key',
    version: 1,
    exam: 'toefl',
    source: { title: '自制校验', level: '', edition: 'local' },
    items: [
      { id: 'r1', skill: 'reading', section: 'Reading', choices: ['A', 'B'], answer: 'A', explanation: '' },
      { id: 'w1', skill: 'writing', section: 'Writing', choices: [], reference: '参考只来自这份 JSON' },
    ],
  })
  const parsed = previewOfficialKeyText(text)
  assert.equal(parsed.ok, true)
  const hash = await sha256Hex(new TextEncoder().encode(text))
  const preview = {
    ...parsed,
    hash,
    title: '自制校验',
    level: '',
    edition: 'local',
    sourceUrl: '',
    createdAt: '2026-11-17T00:00:00.000Z',
  }
  const first = await commitOfficialPack(db, preview, [])
  const progress = { packId: first.packId, answers: { r1: { choice: 'B', correct: false, at: 't' } }, wrong: { r1: { misses: 1, lastAt: 't' } }, resume: { index: 0 }, history: [] }
  await db.putProgress(progress)
  const second = await commitOfficialPack(db, preview, [])
  assert.equal(second.idempotent, true)
  assert.equal((await db.getProgress(first.packId)).answers.r1.choice, 'B')
  db.failNext('quota')
  const other = previewOfficialKeyText(JSON.stringify({
    format: 'kaikou-official-key',
    version: 1,
    exam: 'ielts',
    source: { title: '另一份' },
    items: [{ id: '1', skill: 'reading', choices: ['TRUE', 'FALSE'], answer: 'TRUE' }],
  }))
  const otherPreview = { ...other, hash: 'f'.repeat(64), title: '另一份', level: '', edition: '', sourceUrl: '', createdAt: '2026-11-17T00:00:00.000Z' }
  await assert.rejects(() => commitOfficialPack(db, otherPreview, []))
  assert.equal((await db.listPacks()).length, 1)
  await db.deletePack(first.packId)
  assert.equal((await db.listPacks()).length, 0)
  assert.equal(store[WORD_KEY].includes('2026-12-01'), true)
  const graded = answerOfficial({ packId: 'x', answers: {}, wrong: {}, history: [] }, parsed.items[1], 'my essay', 't2')
  assert.equal(graded.answers.w1.correct, null)
})

test('official backup is a different format from the word backup', () => {
  const parsed = parseOfficialBackup(JSON.stringify({ format: 'kaikou-backup', version: 1, keys: {} }))
  assert.equal(parsed.ok, false)
})
