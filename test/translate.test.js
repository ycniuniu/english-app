import assert from 'node:assert/strict'
import test from 'node:test'
import { packForTranslation, parseMyMemory, pronounceText, translateText, translationDirection } from '../src/translate.js'

test('pronunciation uses the English side already on screen', () => {
  assert.equal(pronounceText('你好', 'Hello', true), 'Hello')
  assert.equal(pronounceText('Hello there', '你好', false), 'Hello there')
})

test('picks the translation direction from the letters in the text', () => {
  assert.deepEqual(translationDirection('你好'), {
    from: 'zh-CN',
    to: 'en',
    english: true,
    label: '中文 → 英文',
  })
  assert.equal(translationDirection('今天天气很好，我想出去走走').from, 'zh-CN')
  assert.equal(translationDirection('Hello').to, 'zh-CN')
  assert.equal(translationDirection('The weather is lovely.').english, false)
  assert.equal(translationDirection('123').label, '英文 → 中文')
})

test('packs long text into short requests', () => {
  const sentence = '今天天气很好，我想出去走走。'
  const text = Array.from({ length: 40 }, () => sentence).join('')
  const chunks = packForTranslation(text, 80)
  assert.ok(chunks.length > 1)
  for (const chunk of chunks) {
    assert.ok(new TextEncoder().encode(chunk).length <= 80)
    assert.ok(chunk.trim())
  }
  assert.equal(packForTranslation('   ').length, 0)
})

test('reads a translation and rejects a quota warning', () => {
  assert.deepEqual(parseMyMemory({ responseStatus: 200, responseData: { translatedText: 'It&#39;s fine &amp; clear' } }), {
    ok: true,
    text: "It's fine & clear",
  })
  const blocked = parseMyMemory({
    responseStatus: 200,
    responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY' },
  })
  assert.equal(blocked.ok, false)
  assert.match(blocked.error, /额度/)
  assert.equal(parseMyMemory({ responseStatus: 200, responseData: {} }).ok, false)
})

test('translateText sends the detected language pair', async () => {
  const calls = []
  const result = await translateText('你好。再见。', {
    maxBytes: 12,
    fetchImpl: async (url) => {
      calls.push(String(url))
      const query = new URL(url).searchParams.get('q')
      return {
        ok: true,
        json: async () => ({ responseStatus: 200, responseData: { translatedText: query.includes('再') ? 'Bye.' : 'Hi.' } }),
      }
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.direction.label, '中文 → 英文')
  assert.ok(calls.length >= 2)
  assert.match(calls[0], /langpair=zh-CN%7Cen/)
  assert.match(result.text, /Hi/)
  assert.match(result.text, /Bye/)
})
