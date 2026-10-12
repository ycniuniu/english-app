import assert from 'node:assert/strict'
import test from 'node:test'
import { cardItem, loadJaProgress, trackIds } from '../src/ja-progress.js'

const words = [
  {
    word: '私',
    reading: 'わたくし',
    kana: false,
    forms: [],
  },
  {
    word: 'ドア',
    reading: 'ドア',
    kana: true,
    forms: [],
  },
  {
    word: '食べる',
    reading: 'たべる',
    kana: false,
    forms: [
      { key: 'masu', name: 'ます形', word: '食べます', reading: 'たべます', quiz: true },
      { key: 'neg', name: '否定形', word: '食べない', reading: 'たべない', quiz: false },
    ],
  },
]

test('japanese progress keeps only its own card ids', () => {
  const loaded = loadJaProgress({
    cards: {
      'w:1': { interval: 3, ease: 2.5, reps: 2, lapses: 0, due: '2026-10-13' },
      'k:2': { interval: 1, ease: 9, reps: 1, lapses: 0, due: '2026-10-12' },
      'c:3:masu': { interval: 1, ease: 2.3, reps: 1, lapses: 0, due: '2026-10-12' },
      'c:3:neg': { interval: 1, ease: 2.3, reps: 1, lapses: 0, due: '2026-10-12' },
      '0': { interval: 1, ease: 2.3, reps: 1, lapses: 0, due: '2026-10-12' },
      'w:x': { interval: 1, ease: 2.3, reps: 1, lapses: 0, due: '2026-10-12' },
    },
  })
  assert.deepEqual(Object.keys(loaded.cards).sort(), ['c:3:masu', 'k:2', 'w:1'])
  assert.equal(loaded.cards['k:2'].ease, 2.8)
})

test('tracks split loanwords and quiz forms', () => {
  assert.deepEqual(trackIds(words, 'word'), ['w:0', 'w:2'])
  assert.deepEqual(trackIds(words, 'kana'), ['k:1'])
  assert.deepEqual(trackIds(words, 'verb'), ['c:2:masu'])
  assert.deepEqual(cardItem(words, 'c:2:masu').answers, ['食べます', 'たべます'])
  assert.deepEqual(cardItem(words, 'w:0').answers, ['私', 'わたくし'])
  assert.equal(cardItem(words, 'c:2:nope'), null)
})
