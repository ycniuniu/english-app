import { EMPTY_FACT } from './word-detail.js'

export { DICT_FIELD_ORDER, EMPTY_FACT, hasText, listOrEmpty } from './word-detail.js'

/** Labeled dictionary row. Missing values render as 无 — never leave a blank gap. */
export function DictField({ label, empty = false, children }) {
  return (
    <div className="fact-block">
      <p className="fact-label">{label}</p>
      {empty ? <p className="fact-none">{EMPTY_FACT}</p> : children}
    </div>
  )
}
