import assert from 'node:assert/strict'
import test from 'node:test'
import { grammarPoints } from '../src/data/study-index.js'
import { starterGrammar } from '../src/data/grammar-starter.js'
import { loadGrammar, recordDrill } from '../src/grammar-progress.js'
import { WORD_KEY } from '../src/storage-keys.js'

const OLD_EN = ['en-a-an', 'en-present-simple', 'en-past-time', 'en-present-perfect', 'en-the', 'en-comparatives', 'en-passive', 'en-conditional', 'en-relative', 'en-however', 'en-modals', 'en-word-form']
const OLD_JA = ['ja-n5-masu', 'ja-n5-te-kudasai', 'ja-n5-ni-iku', 'ja-n4-te-shimau', 'ja-n4-you-ni-suru', 'ja-n4-sugiru', 'ja-n3-you-ni-naru', 'ja-n3-ba-hodo', 'ja-n3-koto-ni-suru', 'ja-n2-wake-dewa-nai', 'ja-n2-ippou', 'ja-n2-koto-naku', 'ja-n1-o-oite', 'ja-n1-ni-katakunai', 'ja-n1-zu-niwa-okanai']

test('starter lessons use new ids and keep old lessons', () => {
  const ids = grammarPoints.map((point) => point.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of OLD_EN.concat(OLD_JA)) assert.ok(ids.includes(id), id)
  assert.equal(starterGrammar.length, 20)
  assert.equal(starterGrammar.filter((point) => point.lang === 'en').length, 10)
  assert.equal(starterGrammar.filter((point) => point.lang === 'ja').length, 10)
  for (const point of starterGrammar) {
    assert.match(point.scope, /不是该教材的授权课程/)
    assert.equal(point.exercises.length, 5)
    assert.equal(point.examples.length, 5)
    assert.equal(point.contrasts.length, 2)
    for (const drill of point.exercises) {
      assert.equal(drill.options.filter((option) => option.id === drill.answer).length, 1)
    }
    if (point.lang === 'ja') {
      for (const example of point.examples) {
        assert.equal(/[\u4e00-\u9fff]/.test(example.reading), false, example.reading)
        assert.equal(example.reading.includes(' '), false, example.reading)
      }
    }
  }
})

test('old grammar progress stays when a new lesson is answered', () => {
  const store = { [WORD_KEY]: '{"cards":{"3":{"due":"2026-12-01","interval":7}}}' }
  globalThis.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem() {
      throw new Error('word key must stay untouched')
    },
  }
  const loaded = loadGrammar({
    version: 1,
    points: {
      'en-however': {
        learned: true,
        learnedAt: '2026-11-01',
        favorite: true,
        reviewOn: '2026-11-20',
        lastResult: 'ok',
        exercise: { choice: 'A', correct: true, at: '2026-11-01T00:00:00.000Z' },
      },
    },
  })
  assert.equal(loaded.ok, true)
  const drill = starterGrammar[0].exercises[0]
  const next = recordDrill(loaded.state, starterGrammar[0].id, 0, drill.answer, true, '2026-11-17T00:00:00.000Z', '2026-11-17')
  assert.equal(next.points['en-however'].learned, true)
  assert.equal(next.points['en-however'].reviewOn, '2026-11-20')
  assert.equal(next.points['en-however'].exercise.choice, 'A')
  assert.equal(next.points[starterGrammar[0].id].exercises['0'].correct, true)
  assert.equal(store[WORD_KEY].includes('2026-12-01'), true)
})
