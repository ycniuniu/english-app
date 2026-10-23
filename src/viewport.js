export const KEYBOARD_OVERLAP = 80

// fullHeight is the keyboard-up baseline. iOS Safari does not shrink the layout
// viewport when the keyboard opens (interactive-widget is ignored), so the
// overlap has to be measured against that baseline, not the current innerHeight.
export function frameForViewport({
  innerWidth = 0,
  innerHeight = 0,
  vvHeight = 0,
  vvOffsetTop = 0,
  fullHeight = 0,
  narrow,
} = {}) {
  const offset = Math.max(0, Number(vvOffsetTop) || 0)
  const visible = Math.max(0, Number(vvHeight) || 0)
  const full = Math.max(Number(fullHeight) || 0, Number(innerHeight) || 0, visible + offset)
  const overlap = Math.max(0, Math.round(full - visible - offset))
  const isNarrow = narrow == null ? Number(innerWidth) <= 839 : Boolean(narrow)
  const keyboard = isNarrow && overlap > KEYBOARD_OVERLAP
  return {
    keyboard,
    offsetTop: Math.round(offset),
    height: Math.round(visible || full),
    keyboardPx: keyboard ? overlap : 0,
  }
}

export function pinDocumentScroll() {
  if (typeof window === 'undefined') return
  if (!window.scrollX && !window.scrollY) return
  window.scrollTo(0, 0)
}
