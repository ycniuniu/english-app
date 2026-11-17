import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.env.E2E_BASE || 'http://127.0.0.1:4173'
const out = '/opt/cursor/artifacts'
mkdirSync(out, { recursive: true })

const words = JSON.stringify({
  cards: {
    3: { interval: 7, ease: 2.3, reps: 4, lapses: 1, due: '2026-12-01', note: 'keep-me' },
    8: { interval: 21, ease: 2.5, reps: 6, lapses: 0, due: '2027-01-02' },
  },
  extra: 'en',
})
const ja = JSON.stringify({
  cards: {
    'w:1': { interval: 3, ease: 2.2, reps: 2, lapses: 0, due: '2026-11-20' },
    'c:2:te': { interval: 8, ease: 2.1, reps: 3, lapses: 1, due: '2026-12-05' },
  },
})

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN' })
await context.addInitScript(({ words: wordText, ja: jaText }) => {
  localStorage.setItem('kaikou.words.v1', wordText)
  localStorage.setItem('kaikou.ja.v1', jaText)
  localStorage.setItem('kaikou.tab.v1', 'translate')
  localStorage.setItem('kaikou.rate.v1', 'slow')
  localStorage.setItem('kaikou.study-lang.v1', 'ja')
}, { words, ja })
const page = await context.newPage()
await page.goto(base)
await page.getByRole('heading', { name: '开口' }).waitFor()
const afterLoad = await page.evaluate(() => ({
  words: localStorage.getItem('kaikou.words.v1'),
  ja: localStorage.getItem('kaikou.ja.v1'),
}))
if (afterLoad.words !== words || afterLoad.ja !== ja) throw new Error('legacy keys changed on first load')

await page.getByRole('button', { name: '刷题' }).click()
await page.getByRole('heading', { name: '选一个考试' }).waitFor()
await shot(page, 'quiz-home-iphone')
await page.getByRole('button', { name: /雅思/ }).click()
await page.getByRole('button', { name: /开始这 20 题/ }).click()
await page.getByRole('radio', { name: /They must pay twelve pounds/ }).click()
await page.getByRole('button', { name: '提交这题' }).click()
await page.getByText('这题先看解析').waitFor()
await page.locator('.result-card').getByText('文章写').scrollIntoViewIfNeeded()
await shot(page, 'quiz-explain-iphone')
await page.getByRole('button', { name: '收藏' }).click()
await page.getByRole('button', { name: '下一题' }).click()
await page.getByRole('button', { name: '返回' }).click()
await page.getByRole('button', { name: '语法学习' }).click()
await page.getByRole('heading', { name: '英语语法' }).waitFor()
await shot(page, 'grammar-home-iphone')
await page.getByRole('button', { name: /however/ }).click()
await page.getByRole('button', { name: '标为学过' }).click()
await page.getByText('复习日').waitFor()
await shot(page, 'grammar-point-iphone')

await page.reload()
await page.getByRole('heading', { name: '开口' }).waitFor()
const afterReload = await page.evaluate(() => ({
  words: localStorage.getItem('kaikou.words.v1'),
  ja: localStorage.getItem('kaikou.ja.v1'),
  quiz: localStorage.getItem('kaikou.quiz.v1'),
  grammar: localStorage.getItem('kaikou.grammar.v1'),
}))
if (afterReload.words !== words || afterReload.ja !== ja) throw new Error('legacy keys changed after quiz, grammar, and reload')
const quiz = JSON.parse(afterReload.quiz)
const grammar = JSON.parse(afterReload.grammar)
if (!quiz.answers['ielts-001'] || quiz.answers['ielts-001'].correct !== false) throw new Error('quiz answer missing')
if (!quiz.favorites['ielts-001']) throw new Error('favorite missing')
const learned = grammar.points['en-however']
if (learned.learned !== true || !/^\d{4}-\d{2}-\d{2}$/.test(learned.reviewOn) || learned.reviewOn <= learned.learnedAt) {
  throw new Error(`grammar review was not scheduled from its own date: ${JSON.stringify(learned)}`)
}

await page.getByRole('button', { name: '备份' }).click()
await page.getByRole('heading', { name: '学习数据' }).waitFor()
await shot(page, 'backup-iphone')
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: '下载备份' }).click(),
])
const backupPath = `${out}/backup-sample.json`
await download.saveAs(backupPath)
const backupText = await (await import('node:fs/promises')).readFile(backupPath, 'utf8')
const backup = JSON.parse(backupText)
if (backup.keys['kaikou.words.v1'] !== words || backup.keys['kaikou.ja.v1'] !== ja) throw new Error('export did not keep raw word records')

const mergeFile = {
  format: 'kaikou-backup',
  version: 1,
  exportedAt: '2026-11-17T00:00:00.000Z',
  keys: {
    'kaikou.words.v1': JSON.stringify({
      cards: {
        3: { interval: 1, ease: 1.3, reps: 0, lapses: 9, due: '2020-01-01' },
        9: { interval: 2, ease: 2.2, reps: 1, lapses: 0, due: '2026-12-12' },
      },
    }),
  },
}
await page.locator('.backup-sheet input[type=file]').setInputFiles({
  name: 'merge.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(mergeFile)),
})
await page.getByText('先看下面的条数').waitFor()
await page.getByRole('button', { name: '确认写入' }).click()
await page.getByText('已写入').waitFor()
const merged = JSON.parse(await page.evaluate(() => localStorage.getItem('kaikou.words.v1')))
if (merged.cards['3'].due !== '2026-12-01' || merged.cards['3'].note !== 'keep-me') throw new Error('merge overwrote an existing card')
if (merged.cards['8'].due !== '2027-01-02') throw new Error('merge dropped a local card')
if (merged.cards['9'].due !== '2026-12-12') throw new Error('merge did not add the new card')
if (merged.extra !== 'en') throw new Error('merge dropped extra word metadata')

await page.locator('.backup-sheet input[type=file]').setInputFiles({
  name: 'bad.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ format: 'kaikou-backup', version: 1, keys: { 'kaikou.words.v1': JSON.stringify({ cards: { 3: { due: 'tomorrow' } } }) } })),
})
await page.getByText('整份备份没有写入').waitFor()
const afterBad = await page.evaluate(() => localStorage.getItem('kaikou.words.v1'))
if (afterBad !== JSON.stringify(merged)) throw new Error('bad import changed word storage')

await page.getByRole('button', { name: '关闭' }).click()
await page.getByRole('button', { name: '单词' }).click()
await page.getByRole('radio', { name: '英语' }).click()
await page.locator('.lang-stage:not(.hidden)').getByText('已学 3').waitFor()
await shot(page, 'words-english-iphone')
await page.getByRole('radio', { name: '日语' }).click()
await page.locator('.lang-stage:not(.hidden)').getByText('已学 1').waitFor()
await shot(page, 'words-still-there-iphone')

const empty = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const emptyPage = await empty.newPage()
await emptyPage.goto(base)
await emptyPage.getByRole('button', { name: '刷题' }).click()
await emptyPage.getByRole('heading', { name: '选一个考试' }).waitFor()
const emptyKeys = await emptyPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('kaikou.words') || key.startsWith('kaikou.ja')))
if (emptyKeys.some((key) => key === 'kaikou.words.v1' || key === 'kaikou.ja.v1')) {
  const values = await emptyPage.evaluate(() => ({ words: localStorage.getItem('kaikou.words.v1'), ja: localStorage.getItem('kaikou.ja.v1') }))
  if (values.words || values.ja) throw new Error('empty profile gained word records')
}

const corrupt = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await corrupt.addInitScript(({ words: wordText }) => {
  localStorage.setItem('kaikou.words.v1', wordText)
  localStorage.setItem('kaikou.quiz.v1', '{not-json')
}, { words })
const corruptPage = await corrupt.newPage()
await corruptPage.goto(base)
await corruptPage.getByRole('button', { name: '刷题' }).click()
await corruptPage.getByText('刷题记录损坏').waitFor()
await shot(corruptPage, 'quiz-corrupt-iphone')
const corruptRaw = await corruptPage.evaluate(() => ({ words: localStorage.getItem('kaikou.words.v1'), quiz: localStorage.getItem('kaikou.quiz.v1') }))
if (corruptRaw.words !== words || corruptRaw.quiz !== '{not-json') throw new Error('corrupt quiz was overwritten')

console.log('e2e ok')
await browser.close()
