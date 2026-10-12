import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDays,
  answersMatch,
  buildQueue,
  duePhrase,
  gradeCard,
  loadProgress,
  needsPreview,
  summarize,
  todayKey,
} from '../src/srs.js'

test('todayKey and addDays use the calendar date', () => {
  assert.equal(todayKey(new Date(2026, 9, 10)), '2026-10-10')
  assert.equal(addDays('2026-10-10', 1), '2026-10-11')
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2024-02-28', 2), '2024-03-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('a correct streak lengthens the interval', () => {
  const today = '2026-10-10'
  const first = gradeCard(null, true, today)
  assert.deepEqual(first, { interval: 1, ease: 2.34, reps: 1, lapses: 0, due: '2026-10-11' })

  const second = gradeCard(first, true, '2026-10-11')
  assert.equal(second.interval, 3)
  assert.equal(second.ease, 2.38)
  assert.equal(second.due, '2026-10-14')

  const third = gradeCard(second, true, '2026-10-14')
  assert.equal(third.interval, 7)
  assert.equal(third.ease, 2.42)

  const fourth = gradeCard(third, true, '2026-10-21')
  assert.equal(fourth.interval, 17)

  const fifth = gradeCard(fourth, true, '2026-11-07')
  assert.equal(fifth.interval, 42)
  assert.equal(fifth.ease, 2.5)
  assert.equal(fifth.reps, 5)
})

test('a miss shortens the interval and stays due today', () => {
  const today = '2026-10-10'
  const fresh = { interval: 0, ease: 2.3, reps: 0, lapses: 0, due: today }
  const missed = gradeCard(null, false, today)
  assert.deepEqual(missed, { interval: 1, ease: 2.12, reps: 0, lapses: 1, due: today })
  assert.deepEqual(fresh, { interval: 0, ease: 2.3, reps: 0, lapses: 0, due: today })

  const mature = { interval: 21, ease: 2.5, reps: 6, lapses: 0, due: today }
  const again = gradeCard(mature, false, today)
  assert.equal(again.interval, 8)
  assert.equal(again.ease, 2.32)
  assert.equal(again.reps, 5)
  assert.equal(again.lapses, 1)
  assert.equal(again.due, today)
  assert.equal(mature.interval, 21)

  const recovered = gradeCard(again, true, today)
  assert.equal(recovered.interval, Math.max(9, Math.round(8 * 2.32)))
  assert.notEqual(recovered.due, today)
})

test('ease stays between 1.3 and 2.8', () => {
  let card = { interval: 10, ease: 2.78, reps: 4, lapses: 0, due: '2026-10-10' }
  card = gradeCard(card, true, '2026-10-10')
  assert.equal(card.ease, 2.8)
  card = gradeCard(card, true, card.due)
  assert.equal(card.ease, 2.8)

  let weak = { interval: 4, ease: 1.4, reps: 2, lapses: 3, due: '2026-10-10' }
  weak = gradeCard(weak, false, '2026-10-10')
  assert.equal(weak.ease, 1.3)
  weak = gradeCard(weak, false, '2026-10-10')
  assert.equal(weak.ease, 1.3)
})

test('answer matching ignores case, space, and curly apostrophes', () => {
  assert.equal(answersMatch('  Ability ', 'ability'), true)
  assert.equal(answersMatch('don’t', "don't"), true)
  assert.equal(answersMatch("don't", 'don’t'), true)
  assert.equal(answersMatch('well  known', 'well known'), true)
  assert.equal(answersMatch('abilty', 'ability'), false)
  assert.equal(answersMatch('   ', 'ability'), false)
  assert.equal(answersMatch('', 'ability'), false)
})

test('the daily queue is due cards, then a batch of new words', () => {
  const today = '2026-10-10'
  const cards = {
    1: { interval: 3, ease: 2.3, reps: 2, lapses: 0, due: '2026-10-11' },
    2: { interval: 1, ease: 2.1, reps: 1, lapses: 1, due: '2026-10-09' },
    5: { interval: 1, ease: 2.1, reps: 1, lapses: 0, due: today },
  }
  assert.deepEqual(buildQueue(cards, 10, today, 2), [2, 5, 0, 3])
  assert.deepEqual(buildQueue(cards, 10, today, 0), [2, 5])
  assert.equal(needsPreview(null), true)
  assert.equal(needsPreview(cards[2]), false)
  assert.equal(needsPreview({ interval: 0, ease: 2.3, reps: 0, lapses: 0, due: today }), true)
})

test('mastery counts learned, familiar, and mastered words', () => {
  const today = '2026-10-10'
  const cards = {
    0: { interval: 21, ease: 2.5, reps: 5, lapses: 0, due: '2026-11-01' },
    1: { interval: 7, ease: 2.4, reps: 3, lapses: 0, due: today },
    2: { interval: 1, ease: 2.1, reps: 1, lapses: 1, due: today },
    99: { interval: 40, ease: 2.5, reps: 8, lapses: 0, due: today },
  }
  assert.deepEqual(summarize(cards, 10, today), {
    learned: 3,
    familiar: 2,
    mastered: 1,
    due: 2,
    fresh: 7,
    total: 10,
  })
  assert.equal(duePhrase(cards[2], today), '今天还会再出现')
  assert.equal(duePhrase(cards[0], today), '下次 22 天后再出现')
  assert.equal(duePhrase({ due: '2026-10-11' }, today), '下次明天再出现')
})

test('stored progress drops broken cards', () => {
  const loaded = loadProgress({
    cards: {
      3: { interval: 4, ease: 2.2, reps: 2, lapses: 1, due: '2026-10-12' },
      4: { interval: -1, ease: 2, reps: 1, lapses: 0, due: '2026-10-12' },
      5: { interval: 1, ease: 2, reps: 1, lapses: 0, due: 'tomorrow' },
      bad: { interval: 1, ease: 2, reps: 1, lapses: 0, due: '2026-10-12' },
    },
  })
  assert.deepEqual(Object.keys(loaded.cards), ['3'])
  assert.equal(loaded.cards[3].interval, 4)
  assert.deepEqual(loadProgress(null), { cards: {} })
})
