import assert from 'node:assert/strict'
import test from 'node:test'
import { listMeta, words } from '../src/data/jlpt-words.js'

const LEVELS = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4, 高频: 5 }
const HAN = /\p{Script=Han}/u

test('bundled JLPT list is offline, leveled, and complete enough to study', () => {
  assert.equal(words.length, 12000)
  assert.equal(listMeta.total, 12000)
  assert.equal(listMeta.n5, 674)
  assert.equal(listMeta.n4, 630)
  assert.equal(listMeta.n3, 1659)
  assert.equal(listMeta.n2, 1778)
  assert.equal(listMeta.n1, 3070)
  assert.equal(listMeta.n5 + listMeta.n4 + listMeta.n3 + listMeta.n2 + listMeta.n1, 7811)
  assert.equal(listMeta.source, 'JMdict')
  assert.ok(words.some((entry) => entry.word === '神社'))
  assert.ok(words.some((entry) => entry.word === '億'))
  assert.equal(words[0].level, 'N5')
  assert.equal(words[0].word, '私')

  let prev = -1
  let kana = 0
  for (const entry of words) {
    const rank = LEVELS[entry.level]
    assert.equal(typeof rank, 'number')
    assert.ok(rank >= prev)
    prev = rank
    assert.ok(entry.word && entry.reading)
    assert.ok(entry.senses.length >= 3)
    assert.ok(entry.phrases.length >= 2)
    assert.ok(entry.pos.length >= 1)
    for (const sense of entry.senses) {
      assert.match(sense.zh, HAN)
      assert.ok(sense.examples.length >= 1)
      for (const [ja, zh] of sense.examples) {
        assert.ok(ja)
        assert.match(zh, HAN)
      }
    }
    if (entry.kana) {
      kana += 1
      assert.ok(entry.syllables?.length >= 1)
      assert.equal(entry.syllables.join(''), entry.word.replaceAll('・', ''))
    }
  }
  assert.equal(kana, listMeta.kana)

  const taberu = words.find((entry) => entry.word === '食べる' && entry.reading === 'たべる')
  assert.deepEqual(
    taberu.forms.map((form) => form.word),
    ['食べます', '食べて', '食べた', '食べられる'],
  )
  assert.ok(taberu.forms.every((form) => form.quiz))

  const coffee = words.find((entry) => entry.word === 'コーヒー')
  assert.deepEqual(coffee.syllables, ['コー', 'ヒー'])
  assert.equal(coffee.kana, true)

  const sore = words.find((entry) => entry.word === 'それ')
  assert.equal(sore.senses[0].zh, '那')

  const ii = words.find((entry) => entry.word === 'いい' && entry.reading === 'いい')
  assert.equal(ii.senses[0].zh, '好的')
  assert.ok(ii.forms.length >= 2)
  assert.ok(ii.forms.every((form) => form.quiz === false))

  const karai = words.find((entry) => entry.word === '辛い' && entry.reading === 'からい')
  assert.equal(karai.senses[0].zh, '辣的')
})
