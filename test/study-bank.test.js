import assert from 'node:assert/strict'
import test from 'node:test'
import { EXAM_CATALOG } from '../src/data/exam-catalog.js'
import { contentCounts, grammarPoints, passages, questions } from '../src/data/study-index.js'
import { passageText } from '../src/data/quiz-shared.js'

const HAN = /\p{Script=Han}/u

test('questions are original, unique, and unambiguous on the page', () => {
  const ids = new Set()
  const passageIds = new Map(passages.map((item) => [item.id, passageText(item)]))
  for (const item of questions) {
    assert.equal(ids.has(item.id), false, item.id)
    ids.add(item.id)
    assert.equal(item.origin, 'original-practice')
    assert.equal(item.license, 'kaikou-original-practice-2026')
    assert.equal(typeof item.yearVersion, 'string')
    assert.ok(item.yearVersion.length > 10)
    assert.equal(item.prompt.length > 0, true, item.id)
    assert.equal(item.stem.length > 0, true, item.id)
    assert.ok(item.options.length >= 3, item.id)
    const optionIds = new Set(item.options.map((option) => option.id))
    assert.equal(optionIds.size, item.options.length, item.id)
    const texts = item.options.map((option) => option.text)
    assert.equal(new Set(texts).size, texts.length, `${item.id} duplicate option`)
    assert.ok(optionIds.has(item.answer), item.id)
    assert.match(item.explanation, HAN, item.id)
    assert.equal(/真题|Cambridge|ETS official|公式問題の転載/.test(item.stem + item.explanation), false, item.id)
    if (item.passageId) {
      const text = passageIds.get(item.passageId)
      assert.ok(text, `${item.id} missing passage`)
      assert.ok(item.evidence.length > 0, item.id)
      assert.ok(text.includes(item.evidence), `${item.id} evidence not in passage: ${item.evidence}`)
    }
    if (item.answer === 'ng') assert.match(item.explanation, /没有|書いてありません|書いてありません|とは書いて/, item.id)
    if (item.grammarId) assert.ok(grammarPoints.some((point) => point.id === item.grammarId), item.grammarId)
  }
})

test('passages are long enough to be real reading material', () => {
  for (const passage of passages) {
    const text = passageText(passage)
    assert.ok(text.length >= 40, passage.id)
    assert.match(passage.note, /原创/)
  }
  const reading = questions.filter((item) => item.passageId && (item.type.includes('read') || item.exam !== 'jlpt' || item.skill === 'reading'))
  assert.ok(reading.length >= 20)
})

test('catalog does not pretend empty types are finished', () => {
  const counts = contentCounts()
  assert.ok(counts.questions >= 80)
  assert.equal(counts.exams.ielts.total, 20)
  assert.equal(counts.exams.toefl.total, 28)
  assert.ok(counts.exams.jlpt.levels.N5 >= 10)
  assert.ok(counts.exams.jlpt.levels.N1 >= 10)
  for (const exam of EXAM_CATALOG) {
    for (const type of exam.types) {
      const count = counts.exams[exam.id].types[type.id]
      if (type.unimplemented) assert.equal(count, 0, type.id)
      else assert.ok(count > 0, `${exam.id} ${type.id}`)
    }
    for (const skill of exam.skills) {
      if (skill.status === 'unavailable') {
        const made = questions.filter((item) => item.exam === exam.id && item.skill === skill.id)
        assert.equal(made.length, 0, skill.id)
      }
    }
  }
  assert.equal(counts.exams.ielts.types['matching-info'], 0)
  assert.equal(counts.exams.toefl.types.email, 0)
  assert.equal(counts.exams.jlpt.types['word-formation'], 0)
  assert.equal(counts.exams.jlpt.types['long-reading'], 0)
  assert.equal(questions.filter((item) => item.exam === 'jlpt' && item.level === 'N1' && item.type === 'orthography').length, 0)
  assert.equal(questions.filter((item) => item.exam === 'jlpt' && item.level === 'N5' && item.type === 'usage').length, 0)
})

test('grammar points have a lesson, a contrast, and one exercise', () => {
  const ids = new Set()
  for (const point of grammarPoints) {
    assert.equal(ids.has(point.id), false)
    ids.add(point.id)
    assert.match(point.summary, HAN)
    assert.match(point.levelNote, /不是|不能/)
    assert.ok(point.examples.length >= 2)
    for (const example of point.examples) {
      assert.ok(example.text.length > 0)
      assert.match(example.zh, HAN)
    }
    const contrasts = point.contrasts || [point.contrast]
    for (const item of contrasts) {
      assert.ok(item.wrong !== item.right)
      assert.match(item.why, HAN)
    }
    const drills = point.exercises || [point.exercise]
    for (const drill of drills) {
      const texts = drill.options.map((option) => option.text)
      assert.equal(new Set(texts).size, texts.length, point.id)
      assert.ok(drill.options.some((option) => option.id === drill.answer))
      assert.match(drill.explanation, HAN)
    }
  }
  assert.equal(grammarPoints.filter((point) => point.lang === 'en').length, 22)
  assert.equal(grammarPoints.filter((point) => point.lang === 'ja').length, 25)
})
