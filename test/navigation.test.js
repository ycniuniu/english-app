import assert from 'node:assert/strict'
import test from 'node:test'
import { legacyTabFor, loadNavigation, navigationFromLegacy, serializeNavigation } from '../src/navigation.js'
import { loadReadingProgress, markReadingOpened, markReadingRead, READING_PROGRESS_KEY } from '../src/reading-progress.js'
import { READ_KEY, WORD_KEY } from '../src/storage-keys.js'

test('old tabs open the matching new section without a new legacy value', () => {
  assert.equal(navigationFromLegacy('words').tab, 'vocab')
  assert.equal(navigationFromLegacy('ja').tab, 'vocab')
  assert.equal(navigationFromLegacy('quiz').study, 'quiz')
  assert.equal(navigationFromLegacy('grammar').study, 'grammar')
  assert.equal(navigationFromLegacy('translate').translate, true)
  const read = (key, fallback) => (key.endsWith('tab.v1') ? 'words' : fallback)
  assert.equal(loadNavigation(read).tab, 'vocab')
  assert.equal(legacyTabFor({ tab: 'vocab', study: 'hub' }), 'words')
  assert.equal(legacyTabFor({ tab: 'reading', study: 'hub' }), '')
  assert.equal(legacyTabFor({ tab: 'today', study: 'hub', translate: true }), 'translate')
  assert.match(serializeNavigation({ tab: 'reading', study: 'hub', article: 'n5-01' }), /n5-01/)
  assert.doesNotMatch(serializeNavigation({ tab: 'today', study: 'hub', article: 'nope' }), /nope/)
})

test('reading progress is separate from the old read draft and word cards', () => {
  assert.notEqual(READING_PROGRESS_KEY, READ_KEY)
  assert.notEqual(READING_PROGRESS_KEY, WORD_KEY)
  const opened = markReadingOpened({ articles: {} }, 'n4-05', '2026-11-25T01:00:00.000Z')
  assert.equal(opened.articles['n4-05'].read, false)
  const read = markReadingRead(opened, 'n4-05', true)
  assert.equal(read.articles['n4-05'].read, true)
  assert.equal(read.articles['n4-05'].openedAt, '2026-11-25T01:00:00.000Z')
  const loaded = loadReadingProgress(read)
  assert.equal(loaded.articles['n4-05'].read, true)
  assert.deepEqual(loadReadingProgress({ articles: { bad: { read: true } } }).articles, {})
})
