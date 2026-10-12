import assert from 'node:assert/strict'
import test from 'node:test'
import { conjugate, isKatakanaWord, posLabels, splitKatakana } from '../src/ja-grammar.js'
import { answersMatchJa } from '../src/ja-answer.js'
import { buildQueueFromIds, gradeCard, summarizeIds, todayKey } from '../src/srs.js'

function forms(word, reading, tags) {
  return Object.fromEntries(conjugate(word, reading, tags).map((item) => [item.key, item.word]))
}

test('verb and adjective forms used in the quizzes', () => {
  assert.deepEqual(forms('食べる', 'たべる', ['v1', 'vt']), {
    masu: '食べます',
    te: '食べて',
    ta: '食べた',
    pot: '食べられる',
  })
  assert.deepEqual(forms('飲む', 'のむ', ['v5m', 'vt']), {
    masu: '飲みます',
    te: '飲んで',
    ta: '飲んだ',
    pot: '飲める',
  })
  assert.deepEqual(forms('行く', 'いく', ['v5k-s', 'vi']), {
    masu: '行きます',
    te: '行って',
    ta: '行った',
    pot: '行ける',
  })
  assert.deepEqual(forms('買う', 'かう', ['v5u', 'vt']), {
    masu: '買います',
    te: '買って',
    ta: '買った',
    pot: '買える',
  })
  assert.deepEqual(forms('話す', 'はなす', ['v5s', 'vt']), {
    masu: '話します',
    te: '話して',
    ta: '話した',
    pot: '話せる',
  })
  assert.deepEqual(forms('来る', 'くる', ['vk', 'vi']), {
    masu: '来ます',
    te: '来て',
    ta: '来た',
    pot: '来られる',
  })
  assert.deepEqual(forms('する', 'する', ['vs-i']), {
    masu: 'します',
    te: 'して',
    ta: 'した',
    pot: 'できる',
  })
  assert.deepEqual(forms('勉強する', 'べんきょうする', ['vs', 'vt']), {
    masu: '勉強します',
    te: '勉強して',
    ta: '勉強した',
    pot: '勉強できる',
  })
  assert.deepEqual(forms('高い', 'たかい', ['adj-i']), {
    neg: '高くない',
    past: '高かった',
  })
  assert.deepEqual(forms('いい', 'いい', ['adj-ix']), {
    neg: 'よくない',
    past: 'よかった',
  })
  assert.deepEqual(forms('静か', 'しずか', ['adj-na']), {
    neg: '静かじゃない',
    past: '静かだった',
  })
  assert.deepEqual(posLabels(['v1', 'vt']), ['动词'])
  assert.deepEqual(posLabels(['n', 'vs']), ['动词', '名词'])
  assert.equal(conjugate('食べる', 'たべる', ['v1'])[0].quiz, true)
  assert.equal(conjugate('高い', 'たかい', ['adj-i'])[0].quiz, false)
})

test('katakana loanwords split into syllables', () => {
  assert.deepEqual(splitKatakana('コーヒー'), ['コー', 'ヒー'])
  assert.deepEqual(splitKatakana('コンピューター'), ['コン', 'ピュー', 'ター'])
  assert.deepEqual(splitKatakana('キャット'), ['キャ', 'ット'])
  assert.deepEqual(splitKatakana('ファイル'), ['ファ', 'イ', 'ル'])
  assert.equal(isKatakanaWord('コーヒー'), true)
  assert.equal(isKatakanaWord('食べる'), false)
  assert.equal(isKatakanaWord('これ'), false)
})

test('japanese answers accept kana and ignore spaces', () => {
  assert.equal(answersMatchJa(' たべる ', ['食べる', 'たべる']), true)
  assert.equal(answersMatchJa('タベル', ['食べる', 'たべる']), true)
  assert.equal(answersMatchJa('コー・ヒー', ['コーヒー']), true)
  assert.equal(answersMatchJa('のむ', ['飲む', 'のむ']), true)
  assert.equal(answersMatchJa('たべます', ['食べます']), false)
})

test('japanese queues keep the same interval rules', () => {
  const today = todayKey(new Date('2026-10-12T12:00:00'))
  const ids = ['w:0', 'w:1', 'k:2', 'c:3:masu']
  assert.deepEqual(buildQueueFromIds({}, ids, today, 2), ['w:0', 'w:1'])
  const due = gradeCard(null, false, today)
  assert.equal(due.due, today)
  const next = gradeCard(due, true, today)
  assert.equal(next.interval, 3)
  const stats = summarizeIds({ 'w:0': next }, ids, today)
  assert.equal(stats.total, 4)
  assert.equal(stats.learned, 1)
  assert.equal(stats.fresh, 3)
})
