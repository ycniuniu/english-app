export const WORD_KEY = 'kaikou.words.v1'
export const JA_WORD_KEY = 'kaikou.ja.v1'
export const TRANSLATE_KEY = 'kaikou.translate.v1'
export const RATE_KEY = 'kaikou.rate.v1'
export const TAB_KEY = 'kaikou.tab.v1'
export const STUDY_LANG_KEY = 'kaikou.study-lang.v1'
export const HOME_TIP_KEY = 'kaikou.home-tip.v1'
export const READ_KEY = 'kaikou.read.v1'
export const READING_PROGRESS_KEY = 'kaikou.ja-reading.progress.v1'

export const QUIZ_KEY = 'kaikou.quiz.v1'
export const GRAMMAR_KEY = 'kaikou.grammar.v1'
export const SNAPSHOT_KEY = 'kaikou.backup.snapshot.v1'

export const LEGACY_KEYS = [
  WORD_KEY,
  JA_WORD_KEY,
  TRANSLATE_KEY,
  RATE_KEY,
  TAB_KEY,
  STUDY_LANG_KEY,
  HOME_TIP_KEY,
  READ_KEY,
]

export const BACKUP_KEYS = [...LEGACY_KEYS, QUIZ_KEY, GRAMMAR_KEY, READING_PROGRESS_KEY]

export const PROTECTED_WORD_KEYS = [WORD_KEY, JA_WORD_KEY]
