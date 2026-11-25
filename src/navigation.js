export const NAV_KEY = 'kaikou.navigation.v2'
export const LEGACY_TAB_KEY = 'kaikou.tab.v1'

const TABS = new Set(['today', 'vocab', 'study', 'reading'])
const STUDIES = new Set(['hub', 'grammar', 'quiz'])

export function emptyNavigation() {
  return { tab: 'today', study: 'hub', article: '' }
}

export function navigationFromLegacy(legacy) {
  if (legacy === 'words' || legacy === 'ja') return { tab: 'vocab', study: 'hub', article: '', translate: false }
  if (legacy === 'quiz') return { tab: 'study', study: 'quiz', article: '', translate: false }
  if (legacy === 'grammar') return { tab: 'study', study: 'grammar', article: '', translate: false }
  if (legacy === 'translate') return { tab: 'today', study: 'hub', article: '', translate: true }
  return { ...emptyNavigation(), translate: false }
}

export function parseNavigation(raw) {
  if (typeof raw !== 'string' || !raw) return null
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object') return null
  if (!TABS.has(value.tab) || !STUDIES.has(value.study)) return null
  const article = typeof value.article === 'string' && /^n[1-5]-\d{2}$/.test(value.article) ? value.article : ''
  return { tab: value.tab, study: value.study, article }
}

export function loadNavigation(readString) {
  const saved = parseNavigation(readString(NAV_KEY, ''))
  if (saved) return { ...saved, translate: false }
  return navigationFromLegacy(readString(LEGACY_TAB_KEY, ''))
}

export function legacyTabFor(nav) {
  if (nav.tab === 'vocab') return 'words'
  if (nav.tab === 'study' && nav.study === 'quiz') return 'quiz'
  if (nav.tab === 'study' && nav.study === 'grammar') return 'grammar'
  if (nav.tab === 'today' && nav.translate) return 'translate'
  return ''
}

export function serializeNavigation(nav) {
  return JSON.stringify({
    tab: TABS.has(nav.tab) ? nav.tab : 'today',
    study: STUDIES.has(nav.study) ? nav.study : 'hub',
    article: /^n[1-5]-\d{2}$/.test(nav.article || '') ? nav.article : '',
  })
}
