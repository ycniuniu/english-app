import assert from 'node:assert/strict'
import test from 'node:test'
import { DICT_FIELD_ORDER, EMPTY_FACT, hasText, listOrEmpty } from '../src/word-detail.js'

test('dictionary detail fields follow the standard order', () => {
  assert.deepEqual(DICT_FIELD_ORDER, [
    '单词',
    '音标',
    '词性',
    '中文释义',
    '例句',
    '搭配',
    '同义词',
    '反义词',
    '词根词缀',
    '派生词',
    '词频',
  ])
  assert.equal(EMPTY_FACT, '无')
})

test('empty helpers treat blank values as missing', () => {
  assert.equal(hasText(''), false)
  assert.equal(hasText('  '), false)
  assert.equal(hasText('sei'), true)
  assert.equal(listOrEmpty([]), null)
  assert.equal(listOrEmpty(null), null)
  assert.deepEqual(listOrEmpty(['a']), ['a'])
})
