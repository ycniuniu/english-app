import assert from 'node:assert/strict'
import test from 'node:test'
import { describeForms, glossPosVaries, recallGlosses, speakableParts, wordPosLabels } from '../src/word-facts.js'

test('recall glosses keep sense order and surface a head gloss that is not already listed', () => {
  assert.deepEqual(
    recallGlosses(
      [
        { pos: '名词', zh: '国家' },
        { pos: '名词', zh: '乡村' },
      ],
      '国家',
    ).map((item) => item.zh),
    ['国家', '乡村'],
  )
  assert.equal(
    glossPosVaries([
      { pos: '名词', zh: '国家' },
      { pos: '名词', zh: '乡村' },
    ]),
    false,
  )
  assert.equal(
    glossPosVaries([
      { pos: '及物动词', zh: '离开' },
      { pos: '名词', zh: '休假' },
    ]),
    true,
  )
  assert.deepEqual(
    recallGlosses([{ pos: '动词', zh: '来' }], '过来').map((item) => item.zh),
    ['过来', '来'],
  )
})

function containsForm(sentence, form) {
  const text = String(sentence || '').toLowerCase()
  const needle = String(form || '').toLowerCase()
  let from = 0
  while (from <= text.length) {
    const at = text.indexOf(needle, from)
    if (at < 0) return false
    const before = at === 0 ? '' : text[at - 1]
    const after = text[at + needle.length] || ''
    const edge = (char) => !char || !/[a-z]/i.test(char)
    if (edge(before) && edge(after)) return true
    from = at + 1
  }
  return false
}

test('verb forms use short English labels and one matching example each', () => {
  const forms = describeForms(['动词 make / made / made / making'], [{ pos: '及物动词', zh: '制造' }])
  assert.deepEqual(
    forms.map((item) => item.label),
    ['base', 'past', 'past participle', '-ing'],
  )
  assert.deepEqual(
    forms.map((item) => item.word),
    ['make', 'made', 'made', 'making'],
  )
  for (const item of forms) {
    assert.equal(/[\u4e00-\u9fff]/.test(item.label), false)
    assert.ok(item.examples.length >= 1 && item.examples.length <= 2)
    assert.equal(containsForm(item.examples[0][0], item.word), true)
    assert.equal(typeof item.examples[0][1], 'string')
  }
  const past = forms.find((item) => item.label === 'past')
  const participle = forms.find((item) => item.label === 'past participle')
  assert.match(past.examples[0][0], /\byesterday\b/)
  assert.doesNotMatch(past.examples[0][0], /\bhave\b/i)
  assert.match(participle.examples[0][0], /\bhave\b/i)
  assert.equal(
    describeForms(['动词 go / went / — / going'], [{ pos: '动词', zh: '去' }]).map((item) => item.label).join(','),
    'base,past,-ing',
  )
  const know = describeForms(['动词 know / knew / known / knowing'], [{ pos: '动词', zh: '知道' }])
  assert.equal(know.find((item) => item.label === '-ing').examples[0][0].includes('are knowing'), false)
  const seem = describeForms(['动词 seem / seemed / seemed / seeming'], [{ pos: '不及物动词', zh: '似乎' }])
  assert.match(seem[0].examples[0][0], /\bseem\b/)
  assert.equal(seem[0].examples[0][0].includes('every day'), false)
})

test('noun and adjective forms stay in Chinese', () => {
  assert.deepEqual(wordPosLabels([{ pos: '及物动词' }, { pos: '名词' }]), ['动词', '名词'])
  assert.deepEqual(describeForms(['名词 child / children'], [{ pos: '名词' }]), [
    { label: '原形（名词）', word: 'child' },
    { label: '复数（名词）', word: 'children' },
  ])
  assert.deepEqual(describeForms(['形容词 good / better / best'], [{ pos: '形容词' }]), [
    { label: '原形（形容词）', word: 'good' },
    { label: '比较级（形容词）', word: 'better' },
    { label: '最高级（形容词）', word: 'best' },
  ])
  assert.deepEqual(
    describeForms(['形容词 difficult / more difficult / most difficult'], [{ pos: '形容词' }]).map((item) => item.word),
    ['difficult', 'more difficult', 'most difficult'],
  )
  assert.deepEqual(describeForms(['无词形变化'], [{ pos: '限定词' }, { pos: '代词' }, { pos: '副词' }]), [
    { label: '无词形变化（限定词、代词、副词）', word: '' },
  ])
  assert.deepEqual(describeForms(['情态动词，无词形变化'], [{ pos: '情态动词' }]), [
    { label: '无词形变化（动词）', word: '' },
  ])
  assert.deepEqual(describeForms(['复数 ones'], [{ pos: '数词' }, { pos: '名词' }]), [
    { label: '复数（名词）', word: 'ones' },
  ])
  assert.deepEqual(describeForms(['本身常作最高级'], [{ pos: '副词' }], 'most'), [
    { label: '最高级（形容词）', word: 'most' },
  ])
})

test('content words in an example can be spoken on their own', () => {
  const parts = speakableParts('She makes coffee every morning.')
  const clickable = parts.filter((part) => part.clickable).map((part) => part.speak)
  assert.deepEqual(clickable, ['makes', 'coffee', 'morning'])
  assert.deepEqual(
    speakableParts("make up one's mind")
      .filter((part) => part.clickable)
      .map((part) => part.speak),
    ['make', 'mind'],
  )
})
