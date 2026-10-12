export function foldKana(value) {
  return [...String(value ?? '')].map((ch) => {
    const code = ch.codePointAt(0)
    if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60)
    return ch
  }).join('')
}

export function normalizeJa(value) {
  return foldKana(String(value ?? '').normalize('NFKC'))
    .trim()
    .replace(/[・･\s]/g, '')
    .replace(/[〜～]/g, '')
}

export function answersMatchJa(input, answers) {
  const left = normalizeJa(input)
  if (!left) return false
  return (answers || []).some((answer) => normalizeJa(answer) === left)
}
