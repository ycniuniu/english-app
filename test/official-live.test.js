import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pairJlptAnswerSheet } from '../src/official-parse.js'
import { pdfTextItems } from '../src/pdf-items.js'

const URLS = {
  '2018': 'https://www.jlpt.jp/samples/sample2018/pdf/N5answer.pdf',
  '2012': 'https://www.jlpt.jp/samples/sample2012/pdf/N5answer.pdf',
}

test('public JLPT N5 answer PDFs pair without printing the key', { skip: process.env.OFFICIAL_JLPT_LIVE !== '1' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'jlpt-answer-'))
  try {
    for (const [edition, url] of Object.entries(URLS)) {
      const response = await fetch(url)
      assert.equal(response.ok, true, edition)
      const bytes = new Uint8Array(await response.arrayBuffer())
      const file = path.join(dir, `${edition}.pdf`)
      await writeFile(file, bytes)
      const extracted = await pdfTextItems(bytes)
      const paired = pairJlptAnswerSheet(extracted.items)
      assert.equal(paired.ok, true, edition)
      assert.equal(paired.unpaired.length, 0, edition)
      assert.equal(extracted.pageCount, 2, edition)
      assert.ok(paired.items.length > 0, edition)
      assert.ok(paired.items.every((item) => ['1', '2', '3', '4'].includes(item.answer)), edition)
      assert.ok(paired.items.every((item) => item.explanation === ''), edition)
      const sections = Object.fromEntries(paired.sections.map((section) => [section.id, section.count]))
      console.log(JSON.stringify({ edition, pages: extracted.pageCount, scored: paired.items.length, sections, source: url }))
      await rm(file)
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
