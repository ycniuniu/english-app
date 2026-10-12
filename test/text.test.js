import assert from 'node:assert/strict'
import test from 'node:test'
import { chunkForSpeech, splitForDisplay, splitSentences } from '../src/text.js'
import { chooseVoice, chosenKind, japanesePhrase } from '../src/voice.js'

test('splits ordinary sentences', () => {
  assert.deepEqual(splitSentences('Hello! How are you? I am fine.'), [
    'Hello!',
    'How are you?',
    'I am fine.',
  ])
})

test('keeps abbreviations, initials, decimals, and ellipsis together', () => {
  assert.deepEqual(
    splitSentences(
      'Dr. Smith went to the U.S. yesterday. He arrived at 3.14 p.m. and said, "Hello!" How are you?',
    ),
    [
      'Dr. Smith went to the U.S. yesterday.',
      'He arrived at 3.14 p.m. and said, "Hello!"',
      'How are you?',
    ],
  )
  assert.deepEqual(splitSentences('Wait... really?'), ['Wait... really?'])
})

test('splits Chinese punctuation and keeps a trailing fragment', () => {
  assert.deepEqual(splitSentences('天气很好。我想出去。'), ['天气很好。', '我想出去。'])
  assert.deepEqual(splitForDisplay('Hello. I am', false), {
    ready: ['Hello.'],
    tail: 'I am',
  })
  assert.deepEqual(splitForDisplay('Hello. I am', true).ready, ['Hello.', 'I am'])
})

test('chunks long text into short speakable pieces', () => {
  const sentence = 'The committee agreed after a long debate.'
  const text = Array.from({ length: 30 }, () => sentence).join(' ')
  const chunks = chunkForSpeech(text)
  assert.ok(chunks.length > 3)
  for (const chunk of chunks) assert.ok(chunk.length <= 160)
  assert.equal(chunks.join(' '), splitSentences(text).join(' '))
})

test('splits one very long sentence on words', () => {
  const text = Array.from({ length: 80 }, () => 'word').join(' ')
  const chunks = chunkForSpeech(text, 40)
  assert.ok(chunks.length > 1)
  for (const chunk of chunks) assert.ok(chunk.length <= 40)
  assert.equal(chunks.join(' '), text)
})

test('prefers any en-US voice over en-GB, then a natural US voice', () => {
  const voices = [
    { name: 'Daniel', lang: 'en-GB', default: true },
    { name: 'Albert', lang: 'en_US' },
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Ting-Ting', lang: 'zh-CN' },
  ]
  assert.equal(chooseVoice(voices).name, 'Samantha')
  assert.equal(chooseVoice([{ name: 'Albert', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }]).lang, 'en-US')
  assert.equal(chooseVoice([{ name: 'Daniel', lang: 'en-GB' }]).name, 'Daniel')
  assert.equal(chooseVoice([{ name: 'Ting-Ting', lang: 'zh-CN' }]), null)
  assert.equal(chosenKind([]), 'pending')
  assert.equal(chosenKind([{ name: 'Ting-Ting', lang: 'zh-CN' }]), 'none')
})

test('japanese voice prefers ja-JP and does not change the English choice', () => {
  const voices = [
    { name: 'Otoya', lang: 'ja' },
    { name: 'Kyoko', lang: 'ja-JP' },
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Ting-Ting', lang: 'zh-CN' },
  ]
  assert.equal(chooseVoice(voices, 'ja').name, 'Kyoko')
  assert.equal(chooseVoice(voices, 'ja').lang, 'ja-JP')
  assert.equal(chooseVoice(voices).name, 'Samantha')
  assert.equal(chooseVoice([{ name: 'Ting-Ting', lang: 'zh-CN' }]), null)
  assert.equal(japanesePhrase('ja'), '日语发音')
  assert.equal(japanesePhrase('none'), '未找到日语语音')
})
