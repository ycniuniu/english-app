import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { frameForViewport } from '../src/viewport.js'

test('iOS keyboard overlap uses the pre-keyboard height, not the shrunken visual viewport', () => {
  const frame = frameForViewport({
    innerWidth: 390,
    innerHeight: 844,
    vvHeight: 430,
    vvOffsetTop: 0,
    fullHeight: 844,
    narrow: true,
  })
  assert.equal(frame.keyboard, true)
  assert.equal(frame.height, 430)
  assert.equal(frame.keyboardPx, 414)
  assert.equal(frame.offsetTop, 0)
})

test('a leftover visual-viewport pan is reported so the shell can track the visible slice', () => {
  const frame = frameForViewport({
    innerWidth: 390,
    innerHeight: 844,
    vvHeight: 430,
    vvOffsetTop: 180,
    fullHeight: 844,
    narrow: true,
  })
  assert.equal(frame.keyboard, true)
  assert.equal(frame.offsetTop, 180)
  assert.equal(frame.keyboardPx, 234)
})

test('desktop and a closed keyboard do not mark the keyboard open', () => {
  assert.equal(
    frameForViewport({
      innerWidth: 1200,
      innerHeight: 800,
      vvHeight: 430,
      fullHeight: 800,
      narrow: false,
    }).keyboard,
    false,
  )
  assert.equal(
    frameForViewport({
      innerWidth: 390,
      innerHeight: 844,
      vvHeight: 820,
      fullHeight: 844,
      narrow: true,
    }).keyboard,
    false,
  )
})

test('translate source stays a few lines tall instead of filling the screen', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  const block = css.match(/\.translate textarea \{[^}]+\}/)?.[0] || ''
  assert.match(block, /flex:\s*none/)
  const min = Number(block.match(/min-height:\s*(\d+)px/)?.[1])
  assert.ok(min >= 64 && min <= 96)
  assert.doesNotMatch(block, /flex:\s*1\b/)
})

test('dictation input stays at least 16px so iOS Safari does not zoom on focus', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  const block = css.match(/\.spell \{[^}]*font-size:\s*(\d+)px/)
  const size = Number(block?.[1])
  assert.ok(size >= 16)
})
