import assert from 'node:assert/strict'
import test from 'node:test'
import { applyBackup, buildBackup, parseBackupText, undoLastImport } from '../src/backup.js'
import { dueGrammarIds, loadGrammar, readGrammarStore, recordExercise, setLearned, toggleGrammarFavorite } from '../src/grammar-progress.js'
import { answerQuestion, loadQuiz, questionsFor, readQuizStore, shuffleIds, summarizeQuestions, toggleFavorite, wrongIds } from '../src/quiz-progress.js'
import { GRAMMAR_KEY, JA_WORD_KEY, QUIZ_KEY, SNAPSHOT_KEY, WORD_KEY } from '../src/storage-keys.js'
import { questions } from '../src/data/study-index.js'

const wordCard = { interval: 7, ease: 2.3, reps: 4, lapses: 1, due: '2026-12-01', note: 'keep-me' }
const jaCard = { interval: 3, ease: 2.2, reps: 2, lapses: 0, due: '2026-11-20' }
const WORDS = JSON.stringify({ cards: { 3: wordCard, 8: { interval: 21, ease: 2.5, reps: 6, lapses: 0, due: '2027-01-02' } }, extra: 'en' })
const JA = JSON.stringify({ cards: { 'w:1': jaCard, 'k:4': { interval: 1, ease: 2.4, reps: 1, lapses: 0, due: '2026-11-18' }, 'c:2:te': { interval: 8, ease: 2.1, reps: 3, lapses: 1, due: '2026-12-05' } } })

function memory(initial = {}, hooks = {}) {
  const data = { ...initial }
  return {
    data,
    getItem(key) {
      if (hooks.throwGet) throw new Error('blocked')
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      if (hooks.failKey && hooks.failKey === key) {
        const error = new Error('full')
        error.name = 'QuotaExceededError'
        throw error
      }
      data[key] = String(value)
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

function install(store) {
  globalThis.localStorage = store
}

test('loading quiz and grammar does not rewrite legacy word records', () => {
  const store = memory({
    [WORD_KEY]: WORDS,
    [JA_WORD_KEY]: JA,
    'kaikou.rate.v1': 'slow',
    'kaikou.tab.v1': 'ja',
    'kaikou.study-lang.v1': 'ja',
    'kaikou.translate.v1': JSON.stringify({ source: '駅', result: '车站', label: '日语', english: false }),
    'kaikou.home-tip.v1': 'dismissed',
    'kaikou.read.v1': 'keep this text',
  })
  install(store)
  const before = { ...store.data }
  const quiz = readQuizStore()
  const grammar = readGrammarStore()
  assert.equal(quiz.status, 'empty')
  assert.equal(grammar.status, 'empty')
  assert.deepEqual(store.data, before)
  const sample = questions[0]
  const next = answerQuestion(quiz.state, sample, sample.options[0].id, '2026-11-17T00:00:00.000Z')
  assert.equal(store.data[WORD_KEY], WORDS)
  assert.equal(store.data[JA_WORD_KEY], JA)
  assert.equal(next.answers[sample.id].correct, sample.options[0].id === sample.answer)
  assert.deepEqual(store.data, before)
})

test('corrupt quiz storage is not overwritten by a read', () => {
  const raw = '{not json'
  const store = memory({ [QUIZ_KEY]: raw, [WORD_KEY]: WORDS })
  install(store)
  const quiz = readQuizStore()
  assert.equal(quiz.status, 'corrupt')
  assert.equal(store.data[QUIZ_KEY], raw)
  assert.equal(store.data[WORD_KEY], WORDS)
})

test('quiz answers, wrong book, favorites, and resume counts stay inside the quiz key', () => {
  const first = questions.find((item) => item.exam === 'ielts')
  let state = loadQuiz(null).state
  state = answerQuestion(state, first, 'wrong-choice', '2026-11-17T01:00:00.000Z')
  assert.equal(state.answers[first.id].correct, false)
  assert.equal(state.wrong[first.id].misses, 1)
  assert.deepEqual(wrongIds(state, questions), [first.id])
  state = toggleFavorite(state, first.id)
  assert.equal(state.favorites[first.id], true)
  state = toggleFavorite(state, first.id)
  assert.equal(state.favorites[first.id], undefined)
  state = answerQuestion(state, first, first.answer, '2026-11-17T02:00:00.000Z')
  assert.equal(state.answers[first.id].correct, true)
  assert.equal(state.wrong[first.id], undefined)
  assert.equal(state.history.length, 2)
  const again = loadQuiz(JSON.parse(JSON.stringify({ ...state, customFlag: true })))
  assert.equal(again.ok, true)
  assert.equal(again.state.extra.customFlag, true)
  const filtered = questionsFor(questions, { exam: 'jlpt', level: 'N5', type: 'short-reading' })
  assert.ok(filtered.length >= 2)
  assert.deepEqual(filtered.map((item) => item.order), filtered.map((item) => item.order).sort((a, b) => a - b))
  const shuffled = shuffleIds(filtered.map((item) => item.id), 7)
  assert.equal(shuffled.length, filtered.length)
  assert.notDeepEqual(shuffled, shuffleIds(filtered.map((item) => item.id), 8))
  const stats = summarizeQuestions(state, [first])
  assert.deepEqual(stats, { total: 1, attempted: 1, correct: 1, wrong: 0, unseen: 0 })
  assert.deepEqual(summarizeQuestions(loadQuiz(null).state, []), { total: 0, attempted: 0, correct: 0, wrong: 0, unseen: 0 })
})

test('grammar review dates do not use the word card key', () => {
  const store = memory({ [WORD_KEY]: WORDS, [JA_WORD_KEY]: JA })
  install(store)
  let state = loadGrammar(null).state
  state = setLearned(state, 'en-however', true, '2026-11-17')
  assert.equal(state.points['en-however'].reviewOn, '2026-11-20')
  state = recordExercise(state, 'ja-n5-te-kudasai', 'B', false, '2026-11-17T03:00:00.000Z', '2026-11-17')
  assert.equal(state.points['ja-n5-te-kudasai'].reviewOn, '2026-11-17')
  state = toggleGrammarFavorite(state, 'ja-n5-te-kudasai')
  assert.equal(state.points['ja-n5-te-kudasai'].favorite, true)
  assert.deepEqual(dueGrammarIds(state, [{ id: 'en-however' }, { id: 'ja-n5-te-kudasai' }], '2026-11-17'), ['ja-n5-te-kudasai'])
  assert.equal(store.data[WORD_KEY], WORDS)
  assert.equal(store.data[JA_WORD_KEY], JA)
  assert.equal(store.data[GRAMMAR_KEY], undefined)
})

test('backup merge keeps existing due dates and is idempotent', () => {
  const store = memory({
    [WORD_KEY]: WORDS,
    [JA_WORD_KEY]: JA,
    'kaikou.rate.v1': 'slow',
    'kaikou.tab.v1': 'words',
  })
  const incomingWords = {
    cards: {
      3: { interval: 1, ease: 1.3, reps: 0, lapses: 9, due: '2020-01-01' },
      9: { interval: 2, ease: 2.2, reps: 1, lapses: 0, due: '2026-12-12', tag: 'from-backup' },
    },
  }
  const backup = {
    format: 'kaikou-backup',
    version: 1,
    exportedAt: '2026-11-17T00:00:00.000Z',
    keys: {
      [WORD_KEY]: JSON.stringify(incomingWords),
      'kaikou.rate.v1': 'fast',
      [QUIZ_KEY]: JSON.stringify({ version: 1, answers: { 'ielts-001': { choice: 'B', correct: true, at: '2026-11-01T00:00:00.000Z' } }, history: [], wrong: {}, favorites: {}, resume: null }),
    },
  }
  const parsed = parseBackupText(JSON.stringify(backup))
  assert.equal(parsed.ok, true)
  const first = applyBackup({ mode: 'merge', parsed: parsed.parsed, ...store })
  assert.equal(first.ok, true)
  const merged = JSON.parse(store.data[WORD_KEY])
  assert.equal(merged.cards['3'].due, '2026-12-01')
  assert.equal(merged.cards['3'].note, 'keep-me')
  assert.equal(merged.cards['8'].due, '2027-01-02')
  assert.equal(merged.cards['9'].due, '2026-12-12')
  assert.equal(merged.extra, 'en')
  assert.equal(store.data[JA_WORD_KEY], JA)
  assert.equal(store.data['kaikou.rate.v1'], 'slow')
  const after = store.data[WORD_KEY]
  const second = applyBackup({ mode: 'merge', parsed: parsed.parsed, ...store })
  assert.equal(second.ok, true)
  assert.equal(second.changed, 0)
  assert.equal(store.data[WORD_KEY], after)
  assert.equal(store.data[JA_WORD_KEY], JA)
})

test('a bad card rejects the whole backup and leaves storage untouched', () => {
  const store = memory({ [WORD_KEY]: WORDS, [JA_WORD_KEY]: JA })
  const bad = parseBackupText(JSON.stringify({
    format: 'kaikou-backup',
    version: 1,
    keys: { [WORD_KEY]: JSON.stringify({ cards: { 3: { interval: 1, ease: 2, reps: 1, lapses: 0, due: 'tomorrow' } } }) },
  }))
  assert.equal(bad.ok, false)
  assert.equal(store.data[WORD_KEY], WORDS)
  const unknown = parseBackupText(JSON.stringify({ format: 'kaikou-backup', version: 1, keys: { 'other.key': '{}' } }))
  assert.equal(unknown.ok, false)
})

test('replace is explicit and undo restores the previous bytes', () => {
  const store = memory({ [WORD_KEY]: WORDS, [JA_WORD_KEY]: JA })
  const replacement = JSON.stringify({ cards: { 1: { interval: 1, ease: 2, reps: 1, lapses: 0, due: '2026-11-19' } } })
  const parsed = parseBackupText(JSON.stringify({ format: 'kaikou-backup', version: 1, keys: { [WORD_KEY]: replacement } }))
  const result = applyBackup({ mode: 'replace', parsed: parsed.parsed, ...store })
  assert.equal(result.ok, true)
  assert.equal(store.data[WORD_KEY], replacement)
  assert.equal(store.data[JA_WORD_KEY], JA)
  const undone = undoLastImport(store.getItem, store.setItem, store.removeItem)
  assert.equal(undone.ok, true)
  assert.equal(store.data[WORD_KEY], WORDS)
  assert.equal(store.data[JA_WORD_KEY], JA)
})

test('a full disk rolls the import back', () => {
  const store = memory({ [WORD_KEY]: WORDS }, { failKey: WORD_KEY })
  const parsed = parseBackupText(JSON.stringify({
    format: 'kaikou-backup',
    version: 1,
    keys: {
      [QUIZ_KEY]: JSON.stringify({ version: 1, answers: {}, history: [], wrong: {}, favorites: {}, resume: null }),
      [WORD_KEY]: JSON.stringify({ cards: { 4: { interval: 1, ease: 2, reps: 1, lapses: 0, due: '2026-11-19' } } }),
    },
  }))
  const result = applyBackup({ mode: 'merge', parsed: parsed.parsed, ...store })
  assert.equal(result.ok, false)
  assert.match(result.error, /退回|没有写入|存储满/)
  assert.equal(store.data[WORD_KEY], WORDS)
  assert.equal(store.data[QUIZ_KEY], undefined)
})

test('blocked storage does not throw and export refuses cleanly', () => {
  const store = memory({ [WORD_KEY]: WORDS }, { throwGet: true })
  const built = buildBackup(store.getItem, '2026-11-17T00:00:00.000Z')
  assert.equal(built.ok, false)
  assert.equal(store.data[WORD_KEY], WORDS)
  assert.equal(Object.prototype.hasOwnProperty.call(store.data, SNAPSHOT_KEY), false)
})

test('source does not clear localStorage', async () => {
  const { readFileSync } = await import('node:fs')
  const files = [
    'src/storage.js',
    'src/backup.js',
    'src/quiz-progress.js',
    'src/grammar-progress.js',
    'src/App.jsx',
    'src/QuizPanel.jsx',
    'src/GrammarPanel.jsx',
    'src/DataBackup.jsx',
  ]
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    assert.equal(text.includes('localStorage.clear'), false, file)
    assert.equal(text.includes('indexedDB'), false, file)
  }
})
