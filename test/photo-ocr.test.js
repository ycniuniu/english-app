import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fetchWithAssetCache, isOcrAssetUrl, prefetchOcrAssets } from '../src/ocr-cache.js'
import {
  estimateFirstLoadSeconds,
  formatMegabytes,
  ocrFirstLoadBytes,
  ocrModelBytes,
  ocrRuntimeBytes,
} from '../src/ocr-models.js'
import { linesFromOcrItems, ocrFailureMessage, photoScript, photoTranslationDirection } from '../src/ocr-text.js'
import { translatePhotoLines } from '../src/photo-translate.js'
import { buildMiniappOcrRequest, MINIAPP_OCR_PATH, mockMiniappOcr, parseMiniappOcrResponse } from '../src/miniapp-ocr.js'
import { translateText, translationDirection } from '../src/translate.js'

test('groups recognized boxes into reading lines and drops weak ones', () => {
  const lines = linesFromOcrItems([
    { text: 'Hello', score: 0.9, poly: [[10, 10], [80, 10], [80, 30], [10, 30]] },
    { text: 'world', score: 0.91, poly: [[90, 12], [160, 12], [160, 28], [90, 28]] },
    { text: '東京', score: 0.8, poly: [[10, 90], [48, 90], [48, 112], [10, 112]] },
    { text: '駅', score: 0.82, poly: [[52, 92], [80, 92], [80, 110], [52, 110]] },
    { text: 'noise', score: 0.05, poly: [[0, 0], [8, 0], [8, 8], [0, 8]] },
    { text: '   ', score: 0.99, poly: [[0, 200], [10, 200], [10, 210], [0, 210]] },
  ])
  assert.deepEqual(lines, ['Hello world', '東京駅'])
})

test('photo lines are English or Japanese and always aim at Chinese', () => {
  assert.equal(photoScript('Hello'), 'en')
  assert.equal(photoScript('こんにちは'), 'ja')
  assert.equal(photoScript('東京駅'), 'ja')
  assert.equal(photoScript('Station 12'), 'en')
  assert.equal(photoTranslationDirection('Hello').from, 'en')
  assert.equal(photoTranslationDirection('こんにちは').from, 'ja')
  assert.equal(photoTranslationDirection('東京').to, 'zh-CN')
  assert.equal(photoTranslationDirection('Hello').english, false)
})

test('typed translation still picks its own direction', () => {
  assert.equal(translationDirection('你好').label, '中文 → 英文')
  assert.equal(translationDirection('Hello').label, '英文 → 中文')
})

test('photo translation calls the existing translator once per line', async () => {
  const seen = []
  const result = await translatePhotoLines(['Hello', 'こんにちは'], {
    translateImpl(text, options) {
      seen.push({ text, from: options.direction.from, to: options.direction.to })
      return Promise.resolve({ ok: true, text: text === 'Hello' ? '你好' : '你好呀' })
    },
  })
  assert.equal(result.ok, true)
  assert.deepEqual(seen, [
    { text: 'Hello', from: 'en', to: 'zh-CN' },
    { text: 'こんにちは', from: 'ja', to: 'zh-CN' },
  ])
  assert.deepEqual(result.rows, [
    { source: 'Hello', zh: '你好', script: 'en' },
    { source: 'こんにちは', zh: '你好呀', script: 'ja' },
  ])
})

test('a failed line keeps earlier rows and stops', async () => {
  const result = await translatePhotoLines(['Hello', 'Bye'], {
    translateImpl(text) {
      if (text === 'Bye') return Promise.resolve({ ok: false, error: '今天的免费翻译额度用完了，请明天再试。' })
      return Promise.resolve({ ok: true, text: '你好' })
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.rows.length, 1)
  assert.match(result.error, /额度/)
  const empty = await translatePhotoLines(['  ', ''])
  assert.equal(empty.ok, false)
  assert.equal(empty.rows.length, 0)
})

test('an explicit direction does not change the default language pair', async () => {
  const calls = []
  const result = await translateText('こんにちは', {
    direction: photoTranslationDirection('こんにちは'),
    fetchImpl: async (url) => {
      calls.push(String(url))
      return {
        ok: true,
        json: async () => ({ responseStatus: 200, responseData: { translatedText: '你好' } }),
      }
    },
  })
  assert.equal(result.ok, true)
  assert.match(calls[0], /langpair=ja%7Czh-CN/)
  assert.equal(result.text, '你好')

  const plain = await translateText('Hello', {
    fetchImpl: async (url) => {
      calls.push(String(url))
      return {
        ok: true,
        json: async () => ({ responseStatus: 200, responseData: { translatedText: '你好' } }),
      }
    },
  })
  assert.match(calls[1], /langpair=en%7Czh-CN/)
  assert.equal(plain.direction.label, '英文 → 中文')
})

test('model files are cached and ordinary translation requests are not', async () => {
  assert.equal(isOcrAssetUrl('/ocr/PP-OCRv5_mobile_rec_onnx_infer.tar'), true)
  assert.equal(isOcrAssetUrl('https://api.mymemory.translated.net/get?q=hi'), false)

  const store = new Map()
  const cachesImpl = {
    async open() {
      return {
        async match(url) {
          return store.get(url)
        },
        async put(url, response) {
          store.set(url, response)
        },
      }
    },
  }
  let calls = 0
  const fetchImpl = async () => {
    calls += 1
    return new Response('weights', { status: 200 })
  }
  const first = await fetchWithAssetCache('/ocr/model.tar', {}, { fetchImpl, cachesImpl })
  assert.equal(await first.text(), 'weights')
  const second = await fetchWithAssetCache('/ocr/model.tar', {}, { fetchImpl, cachesImpl })
  assert.equal(await second.text(), 'weights')
  assert.equal(calls, 1)

  let other = 0
  const network = async () => {
    other += 1
    return new Response('translated', { status: 200 })
  }
  await fetchWithAssetCache('https://api.mymemory.translated.net/get?q=hi', {}, { fetchImpl: network, cachesImpl })
  await fetchWithAssetCache('https://api.mymemory.translated.net/get?q=hi', {}, { fetchImpl: network, cachesImpl })
  assert.equal(other, 2)
})

test('prefetch reads each model once and reports bytes', async () => {
  const seen = []
  const payload = new TextEncoder().encode('abc')
  await prefetchOcrAssets(['/ocr/a.tar', '/ocr/b.tar'], {
    expectedBytes: [3, 3],
    fetchImpl: async (url) => {
      seen.push(url)
      return new Response(payload, { status: 200 })
    },
    onProgress(progress) {
      assert.equal(progress.total, 6)
      assert.ok(progress.loaded > 0)
    },
  })
  assert.deepEqual(seen, ['/ocr/a.tar', '/ocr/b.tar'])
})

test('a failed download is not described as a successful photo', () => {
  assert.equal(ocrFailureMessage({ message: 'Failed to download model' }), '识别模型没有下载下来，请联网后再试。')
  assert.equal(ocrFailureMessage({ message: 'PaddleOCR.js requires an HTTP(S) origin' }), '请用浏览器打开页面后再拍照。')
  assert.equal(ocrFailureMessage({ name: 'AbortError' }), '')
  assert.match(ocrFailureMessage(new Error('session')), /清晰/)
})

test('first-load size uses the measured files', () => {
  assert.equal(formatMegabytes(4843520), '4.6 MB')
  assert.equal(formatMegabytes(16701440), '15.9 MB')
  assert.equal(formatMegabytes(ocrModelBytes()), '20.5 MB')
  assert.equal(formatMegabytes(ocrRuntimeBytes()), '24.1 MB')
  assert.equal(formatMegabytes(ocrFirstLoadBytes()), '44.6 MB')
  assert.equal(Math.round(estimateFirstLoadSeconds(10)), 37)
  assert.equal(Math.round(estimateFirstLoadSeconds(20)), 19)
  assert.equal(Math.round(estimateFirstLoadSeconds(50)), 7)
  assert.equal(estimateFirstLoadSeconds(0), null)
})

test('mini program placeholder returns bilingual lines and rejects an empty photo', () => {
  assert.equal(MINIAPP_OCR_PATH, '/api/photo-translate')
  const built = buildMiniappOcrRequest({ imageBase64: 'data:image/jpeg;base64,abc', mime: '' })
  assert.equal(built.ok, true)
  assert.equal(built.request.imageBase64, 'abc')
  assert.equal(built.request.mime, 'image/jpeg')
  assert.equal(buildMiniappOcrRequest({}).ok, false)
  const mocked = mockMiniappOcr({ imageBase64: 'abc' })
  const parsed = parseMiniappOcrResponse(mocked)
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.rows, [
    { source: 'Hello', zh: '你好' },
    { source: '駅', zh: '车站' },
  ])
  assert.equal(parseMiniappOcrResponse({ ok: false, error: '忙' }).error, '忙')
})

test('the photo entry stays on the translate page and does not touch stored keys', () => {
  const app = readFileSync('src/App.jsx', 'utf8')
  const nav = app.slice(app.indexOf('<nav'), app.indexOf('</nav>'))
  assert.equal((nav.match(/<button/g) || []).length, 2)
  assert.match(nav, />\s*翻译\s*</)
  assert.match(nav, />\s*单词\s*</)
  assert.doesNotMatch(nav, /拍照/)

  const panel = readFileSync('src/TranslatePanel.jsx', 'utf8')
  assert.match(panel, /kaikou\.translate\.v1/)
  assert.match(panel, /<PhotoTranslate \/>/)
  assert.doesNotMatch(panel, /localStorage/)

  const photo = readFileSync('src/PhotoTranslate.jsx', 'utf8')
  assert.match(photo, /capture="environment"/)
  assert.match(photo, /accept="image\/\*"/)
  assert.match(photo, />\s*拍照/)
  assert.match(photo, />\s*选图/)
  assert.doesNotMatch(photo, /localStorage|kaikou\.|getUserMedia/)

  const runtime = readFileSync('src/ocr-runtime.js', 'utf8')
  assert.match(runtime, /numThreads:\s*1/)
  assert.match(runtime, /textDetectionModelName: OCR_MODELS\.detection\.name/)
  assert.match(runtime, /textRecognitionModelName: OCR_MODELS\.recognition\.name/)
  assert.doesNotMatch(runtime, /localStorage|kaikou\./)
  const models = readFileSync('src/ocr-models.js', 'utf8')
  assert.match(models, /PP-OCRv5_mobile_det/)
  assert.match(models, /PP-OCRv5_mobile_rec/)

  const plan = readFileSync('docs/camera-ocr-plan.md', 'utf8')
  assert.match(plan, /能离线就离线/)
  assert.match(plan, /AVFoundation/)
  assert.match(plan, /CameraX/)
  assert.match(plan, /20\.5/)
  assert.match(plan, /44\.6/)
  assert.match(plan, /37/)
  assert.match(plan, /\/api\/photo-translate/)
  assert.match(plan, /2MB|2M/)
})
