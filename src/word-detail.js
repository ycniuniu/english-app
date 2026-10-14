export const EMPTY_FACT = '无'

export const DICT_FIELD_ORDER = [
  '单词',
  '音标',
  '词性',
  '中文释义',
  '例句',
  '搭配',
  '同义词',
  '反义词',
  '词根词缀',
  '派生词',
  '词频',
]

export function hasText(value) {
  return String(value ?? '').trim().length > 0
}

export function listOrEmpty(items) {
  return Array.isArray(items) && items.length > 0 ? items : null
}
