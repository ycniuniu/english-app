import assert from 'node:assert/strict'
import test from 'node:test'
import { describeForms, speakableParts, wordPosLabels } from '../src/word-facts.js'

test('inflections are labeled with a Chinese part of speech', () => {
  assert.deepEqual(describeForms(['动词 make / made / made / making'], [{ pos: '及物动词' }]), [
    { label: '原形（动词）', word: 'make' },
    { label: '过去式（动词）', word: 'made' },
    { label: '过去分词（动词）', word: 'made' },
    { label: '现在分词（动词）', word: 'making' },
  ])
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
  assert.deepEqual(
    describeForms(['动词 go / went / — / going'], [{ pos: '动词' }]).map((item) => item.label),
    ['原形（动词）', '过去式（动词）', '现在分词（动词）'],
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
