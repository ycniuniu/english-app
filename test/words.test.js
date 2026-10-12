import assert from 'node:assert/strict'
import test from 'node:test'
import { details, listMeta, words } from '../src/data/ielts-words.js'
import { describeForms, wordPosLabels } from '../src/word-facts.js'

const WORD_RE = /^[A-Za-z][A-Za-z'-]{1,30}$/
const CJK_RE = /[\u4e00-\u9fff]/

test('the memory list is about ten thousand unique headwords', () => {
  assert.equal(words.length, 10000)
  assert.equal(listMeta.total, 10000)
  assert.equal(listMeta.source, 'ECDICT')
  assert.ok(listMeta.ielts > 4500 && listMeta.ielts < words.length)

  const seen = new Set()
  for (const row of words) {
    assert.equal(row.length, 3)
    const [word, zh, phonetic] = row
    assert.match(word, WORD_RE)
    assert.ok(word.length >= 3)
    assert.ok(!word.startsWith('-') && !word.endsWith('-'))
    assert.ok(CJK_RE.test(zh))
    assert.ok(zh.length <= 36)
    assert.equal(typeof phonetic, 'string')
    const key = word.toLowerCase()
    assert.equal(seen.has(key), false)
    seen.add(key)
  }
})

test('inflections are folded back and common words come first', () => {
  const index = new Map(words.map((row, id) => [row[0].toLowerCase(), id]))
  assert.equal(words[0][0], 'say')
  assert.equal(words[0][1], '说')
  assert.equal(words[index.get('school')][1], '学校')
  assert.equal(words[index.get('good')][1], '好的')
  assert.equal(words[index.get('leave')][1], '离开')
  assert.equal(words[index.get('guy')][1], '家伙')
  assert.ok(index.has('whale'))
  assert.ok(index.has('child'))
  assert.ok(index.has('ability'))
  assert.ok(index.has('abandon'))
  assert.equal(index.has('whales'), false)
  assert.equal(index.has('children'), false)
  assert.equal(index.has('words'), false)
  assert.ok(index.get('school') < listMeta.ielts)
})

test('every card has forms, several senses, examples, and phrases', () => {
  assert.equal(details.length, words.length)
  const index = new Map(words.map((row, id) => [row[0].toLowerCase(), id]))
  const make = details[index.get('make')]
  assert.ok(make.forms.some((line) => line.includes('make / made / made / making')))
  assert.deepEqual(wordPosLabels(make.senses), ['动词'])
  const makeForms = describeForms(make.forms, make.senses, 'make')
  assert.ok(makeForms.some((item) => item.label === '过去式（动词）' && item.word === 'made'))
  assert.ok(makeForms.some((item) => item.label === '过去分词（动词）' && item.word === 'made'))
  assert.ok(makeForms.some((item) => item.label === '现在分词（动词）' && item.word === 'making'))
  const glosses = make.senses.map((sense) => sense.zh)
  for (const gloss of ['制造', '使得', '做决定', '赚取']) {
    assert.ok(glosses.includes(gloss))
  }
  for (const sense of make.senses) {
    assert.equal(sense.pos, '及物动词')
  }
  const coffee = make.senses
    .flatMap((sense) => sense.examples)
    .find(([en]) => en === 'She makes coffee every morning.')
  assert.deepEqual(coffee, ['She makes coffee every morning.', '她每天早上煮咖啡。'])
  const phrases = make.phrases.map(([en]) => en)
  assert.ok(phrases.includes('make a mistake'))
  assert.ok(phrases.includes('make progress'))
  assert.ok(phrases.includes("make up one's mind"))

  for (const detail of details) {
    assert.ok(detail.forms.length >= 1)
    assert.ok(detail.senses.length >= 3)
    for (const sense of detail.senses) {
      assert.equal(typeof sense.pos, 'string')
      assert.ok(sense.pos.length > 0)
      assert.ok(CJK_RE.test(sense.zh))
      assert.ok(sense.examples.length >= 1)
      for (const pair of sense.examples) {
        assert.equal(pair.length, 2)
        assert.match(pair[0], /[A-Za-z]/)
        assert.ok(CJK_RE.test(pair[1]))
      }
    }
    assert.ok(detail.phrases.length >= 2)
    for (const pair of detail.phrases) {
      assert.equal(pair.length, 2)
      assert.match(pair[0], /[A-Za-z]/)
      assert.ok(CJK_RE.test(pair[1]))
    }
  }
})
