export const CONTENT_CHECKED_ON = '2026-11-17'

export const LICENSE_ID = 'kaikou-original-practice-2026'

export const EXAM_CATALOG = [
  {
    id: 'ielts',
    name: '雅思',
    subtitle: 'IELTS Academic 阅读题型的文字练习',
    disclaimer: '这些是原创文字题，不是官方真题，也不是 60 分钟、三篇文章、40 题的完整阅读考试。没有听力音频、作文或口语，不能自动评分，也不能换算成雅思分数。',
    levels: [],
    formatChecked: {
      status: 'checked',
      checkedOn: CONTENT_CHECKED_ON,
      note: '题型名称对照 ielts.org 上 Academic Reading 的公开说明。官网样题没有抄进应用。没有收录分数换算表。',
      pages: [
        {
          title: 'IELTS Academic Reading format',
          url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
        },
        {
          title: 'Academic sample questions（只作索引，未复制）',
          url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
        },
      ],
    },
    skills: [
      { id: 'reading', name: '阅读', status: 'practice', note: '只用原创短文做文字选择。不是正式阅读卷。' },
      { id: 'listening', name: '听力', status: 'unavailable', note: '没有音频，不能作答，也没有自动评分。' },
      { id: 'writing', name: '写作', status: 'unavailable', note: '没有作文，也没有自动评分。' },
      { id: 'speaking', name: '口语', status: 'unavailable', note: '没有口语题，也没有自动评分。' },
    ],
    types: [
      { id: 'mcq', name: '单项选择', skill: 'reading', official: '官网 Multiple choice（单选）。这里每次四选一。', levels: null },
      { id: 'tfng', name: '判断信息', skill: 'reading', official: '官网 Identifying information：True / False / Not Given。False 是和文章相反，Not Given 是文章没说。', levels: null },
      { id: 'ynng', name: '判断观点', skill: 'reading', official: '官网 Identifying views/claims：Yes / No / Not Given。看的是文中人或作者的看法。', levels: null },
      { id: 'heading', name: '段落标题（简化）', skill: 'reading', official: '官网 Matching headings 是一整篇、标题比段落多。这里每次只判断一个段落。', levels: null },
      { id: 'matching-info', name: '信息配对', skill: 'reading', official: '官网有 Matching information。本题库还没有这一类。', levels: null, unimplemented: true },
      { id: 'matching-features', name: '特征配对', skill: 'reading', official: '官网有 Matching features。本题库还没有这一类。', levels: null, unimplemented: true },
      { id: 'sentence-endings', name: '句尾配对', skill: 'reading', official: '官网有 Matching sentence endings。本题库还没有这一类。', levels: null, unimplemented: true },
      { id: 'completion', name: '填空', skill: 'reading', official: '官网有句子、摘要、笔记、表格、流程图和简答。本题库没有手写填空，避免误判拼写。', levels: null, unimplemented: true },
      { id: 'diagram', name: '图示标签', skill: 'reading', official: '官网有 Diagram label completion。本题库还没有这一类。', levels: null, unimplemented: true },
    ],
  },
  {
    id: 'toefl',
    name: '托福',
    subtitle: '对照 2026 年 TOEFL iBT 阅读与句子重组说明的文字练习',
    disclaimer: '这些是原创文字题，不是 ETS 真题，也不是自适应完整考试。听力、口语，以及写作里的邮件和学术讨论都没有自动评分。这里的对错不能换算成托福分数。',
    levels: [],
    formatChecked: {
      status: 'checked',
      checkedOn: CONTENT_CHECKED_ON,
      note: '对照 ETS 公开的 Updated TOEFL iBT Test Overview，以及 2026 Test Specifications 里能读到的任务名称。官方样题和概述里的例题没有抄进应用。题量和时间以公开文件当时的写法为准，文件自己也写明发布前可能微调。没有收录分数换算。',
      pages: [
        { title: 'TOEFL iBT test content', url: 'https://www.ets.org/toefl/test-takers/ibt/about/content.html' },
        { title: 'Updated TOEFL iBT Test Overview (PDF)', url: 'https://www.ets.org/pdfs/toefl/toefl-ibt-test-overview.pdf' },
        { title: 'TOEFL iBT 2026 specifications (PDF)', url: 'https://www.ets.org/pdfs/toefl/toefl-ibt-test-specifications-2026.pdf' },
      ],
    },
    skills: [
      { id: 'reading', name: '阅读', status: 'practice', note: '含日常短文、学术短文，以及用选择题代替的补词。不是官方 Complete the Words 的补字母界面，也不是自适应。' },
      { id: 'writing', name: '写作', status: 'partial', note: '只做了语序四选一，用来练习 Build a Sentence 这一类机器评分的组句。没有 Write an Email，也没有 Write for an Academic Discussion，这两项没有自动评分。' },
      { id: 'listening', name: '听力', status: 'unavailable', note: '没有音频。Listen and Choose a Response、对话、通知和学术讲话都没有。' },
      { id: 'speaking', name: '口语', status: 'unavailable', note: '没有 Listen and Repeat，也没有面试。没有自动评分。' },
    ],
    types: [
      { id: 'daily-life', name: '日常短文', skill: 'reading', official: '2026 阅读里的 Read in Daily Life：通知、邮件、菜单、短信一类短文，后面跟选择题。', levels: null },
      { id: 'academic', name: '学术短文', skill: 'reading', official: '2026 阅读里的 Read an Academic Passage：约 200 词的说明文，问事实、词义、推断、关系和目的。这里每篇五题，但不是官方篇幅和自适应组卷。', levels: null },
      { id: 'word-choice', name: '选词补全', skill: 'reading', official: '官方 Complete the Words 是在段落里补字母。这里改成选择完整单词，方便手机点选。', levels: null },
      { id: 'sentence-order', name: '语序四选一', skill: 'writing', official: '对应写作部分 Build a Sentence 的组句能力，但官方是重组句子并由机器评分。这里只是四选一，不是拖拽题。', levels: null },
      { id: 'email', name: '写邮件', skill: 'writing', official: '2026 写作有 Write an Email。本题库没有，也不能自动评分。', levels: null, unimplemented: true },
      { id: 'discussion', name: '学术讨论写作', skill: 'writing', official: '2026 写作有 Write for an Academic Discussion。本题库没有，也不能自动评分。', levels: null, unimplemented: true },
    ],
  },
  {
    id: 'jlpt',
    name: '日语等级考试',
    subtitle: '按 JLPT N5–N1 的文字题来练习',
    disclaimer: '这里把「国内参加的日语等级考试」先做成日本语能力测试 JLPT 的 N5、N4、N3、N2、N1。不是日语专业四级、专业八级，也不是大学日语四六级。题目是原创练习，不是日本国际交流基金会或日本国际教育支援协会的真题。没有听力，不能换算成合格分。',
    levels: [
      { id: 'N5', name: 'N5' },
      { id: 'N4', name: 'N4' },
      { id: 'N3', name: 'N3' },
      { id: 'N2', name: 'N2' },
      { id: 'N1', name: 'N1' },
    ],
    formatChecked: {
      status: 'checked',
      checkedOn: CONTENT_CHECKED_ON,
      note: '大题有无对照 jlpt.jp 的「試験科目と問題の構成」。N1 聴解从 2022 年 12 月那次起是 55 分钟，页面上仍如此。官方样题没有抄进应用。没有把合格线和得分当成练习分数。',
      pages: [
        { title: '試験科目と問題の構成', url: 'https://www.jlpt.jp/guideline/testsections.html' },
        { title: 'Composition of test sections (English)', url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
      ],
    },
    skills: [
      { id: 'language', name: '文字・語彙・文法', status: 'practice', note: '只做页面上标了题量的文字选择题。' },
      { id: 'reading', name: '读解', status: 'practice', note: '短文、中文和信息检索有原创材料。长文、统合理解和主张理解如果题量为 0，就是还没有，不算练完。' },
      { id: 'listening', name: '聴解', status: 'unavailable', note: '没有音频。课题理解、ポイント理解、即时应答等都没有。' },
    ],
    types: [
      { id: 'kanji-reading', name: '汉字读音', skill: 'language', official: '漢字読み。N5–N1 都有。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'orthography', name: '表记', skill: 'language', official: '表記。官方表里 N1 没有这一大题。', levels: ['N5', 'N4', 'N3', 'N2'] },
      { id: 'word-formation', name: '词的构成', skill: 'language', official: '語形成。官方表里只有 N2。本题库还没有。', levels: ['N2'], unimplemented: true },
      { id: 'context', name: '语境用词', skill: 'language', official: '文脈規定。N5–N1 都有。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'paraphrase', name: '近义替换', skill: 'language', official: '言い換え類義。N5–N1 都有。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'usage', name: '用法', skill: 'language', official: '用法。官方表里 N5 没有。', levels: ['N4', 'N3', 'N2', 'N1'] },
      { id: 'grammar-form', name: '语法形式', skill: 'language', official: '文の文法1（文法形式の判断）。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'composition', name: '句子组装', skill: 'language', official: '文の文法2（文の組み立て）。官方是把四块放进句子并选出星号处的一项。这里沿用这个问法。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'text-grammar', name: '篇章语法', skill: 'language', official: '文章の文法。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'short-reading', name: '短文阅读', skill: 'reading', official: '内容理解（短文）。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'mid-reading', name: '中篇阅读', skill: 'reading', official: '内容理解（中文）。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { id: 'long-reading', name: '长文阅读', skill: 'reading', official: '内容理解（長文）。官方表里 N1 和 N3 有，N2、N4、N5 没有。本题库还没有。', levels: ['N1', 'N3'], unimplemented: true },
      { id: 'integrated-reading', name: '统合理解', skill: 'reading', official: '統合理解。官方表里 N1 和 N2 有。本题库还没有。', levels: ['N1', 'N2'], unimplemented: true },
      { id: 'thematic-reading', name: '主张理解', skill: 'reading', official: '主張理解（長文）。官方表里 N1 和 N2 有。本题库还没有。', levels: ['N1', 'N2'], unimplemented: true },
      { id: 'info-retrieval', name: '信息检索', skill: 'reading', official: '情報検索。', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
    ],
  },
]

export function examById(id) {
  return EXAM_CATALOG.find((item) => item.id === id) || null
}
