import { EXAM_CATALOG } from './exam-catalog.js'
import { englishGrammar } from './grammar-en.js'
import { japaneseGrammar } from './grammar-ja.js'
import { starterGrammar } from './grammar-starter.js'
import { ieltsPassages, ieltsQuestions } from './quiz-ielts.js'
import { jlptPassages, jlptQuestions } from './quiz-jlpt.js'
import { toeflPassages, toeflQuestions } from './quiz-toefl.js'

export const passages = [...ieltsPassages, ...toeflPassages, ...jlptPassages]
export const questions = [...ieltsQuestions, ...toeflQuestions, ...jlptQuestions]
export const grammarPoints = [...englishGrammar, ...japaneseGrammar, ...starterGrammar]

const passageMap = new Map(passages.map((item) => [item.id, item]))
const grammarMap = new Map(grammarPoints.map((item) => [item.id, item]))
const questionMap = new Map(questions.map((item) => [item.id, item]))

export function passageById(id) {
  return id ? passageMap.get(id) || null : null
}

export function grammarById(id) {
  return id ? grammarMap.get(id) || null : null
}

export function questionById(id) {
  return questionMap.get(id) || null
}

export function countQuestions(filter = {}) {
  return questions.filter((item) => {
    if (filter.exam && item.exam !== filter.exam) return false
    if (filter.level && item.level !== filter.level) return false
    if (filter.type && item.type !== filter.type) return false
    if (filter.skill && item.skill !== filter.skill) return false
    return true
  }).length
}

export function contentCounts() {
  const exams = {}
  for (const exam of EXAM_CATALOG) {
    const levels = {}
    for (const level of exam.levels) levels[level.id] = countQuestions({ exam: exam.id, level: level.id })
    const types = {}
    for (const type of exam.types) {
      types[type.id] = countQuestions({ exam: exam.id, type: type.id })
    }
    exams[exam.id] = {
      total: countQuestions({ exam: exam.id }),
      levels,
      types,
    }
  }
  return {
    questions: questions.length,
    passages: passages.length,
    grammar: grammarPoints.length,
    englishGrammar: englishGrammar.length,
    japaneseGrammar: japaneseGrammar.length,
    exams,
  }
}
