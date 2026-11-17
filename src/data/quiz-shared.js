import { LICENSE_ID } from './exam-catalog.js'

export const TFNG = [
  { id: 'true', text: 'True，和文章信息一致' },
  { id: 'false', text: 'False，和文章信息相反' },
  { id: 'ng', text: 'Not Given，文章没有说' },
]

export const YNNG = [
  { id: 'yes', text: 'Yes，文中这个人就是这个看法' },
  { id: 'no', text: 'No，文中这个人不是这个看法' },
  { id: 'ng', text: 'Not Given，看不出这个看法' },
]

export function passageText(passage) {
  return passage.paragraphs.map((item) => item.text).join('\n')
}

export function question(fields) {
  return {
    origin: 'original-practice',
    license: LICENSE_ID,
    level: fields.level || '',
    grammarId: fields.grammarId || '',
    passageId: fields.passageId || '',
    evidence: fields.evidence || '',
    ...fields,
  }
}
