import { LICENSE_ID } from './exam-catalog.js'

const note = '学习参考分级，不是雅思或托福的官方大纲。'

function point(fields) {
  return { origin: 'original-practice', license: LICENSE_ID, lang: 'en', levelNote: note, ...fields }
}

function ex(stem, options, answer, explanation) {
  const [a, b, c, d] = options
  return {
    stem,
    options: [
      { id: 'A', text: a },
      { id: 'B', text: b },
      { id: 'C', text: c },
      { id: 'D', text: d },
    ],
    answer,
    explanation,
  }
}

export const englishGrammar = [
  point({
    id: 'en-a-an',
    level: 'A2',
    title: 'a 和 an',
    summary: '可数名词第一次被提到、又是泛指一个时，用 a 或 an。看的是后面单词的发音，不是字母。元音音素开头用 an。',
    examples: [
      { text: 'She bought an umbrella.', zh: '她买了一把伞。umbrella 以元音开头。' },
      { text: 'It takes an hour.', zh: '需要一小时。hour 的 h 不发音。' },
    ],
    contrast: { wrong: 'an university', right: 'a university', why: 'university 开头的音是 /juː/，不是元音音素，所以用 a。' },
    exercise: ex('Choose the sentence that is correct.', ['He is an honest person.', 'He is a honest person.', 'He is an hour late is wrong here.', 'He is an university student.'], 'A', 'honest 的 h 不发音，用 an。university 用 a。C 不是一句完整可用的话。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-present-simple',
    level: 'A2',
    title: '一般现在时：习惯',
    summary: '一般现在时说习惯、时刻表和现在的状态。第三人称单数动词加 -s。',
    examples: [
      { text: 'The library closes at 18:00.', zh: '图书馆 18:00 关门。这是固定时间。' },
      { text: 'She walks to class on Mondays.', zh: '她周一走着去上课。这是习惯。' },
    ],
    contrast: { wrong: 'She walk to class on Mondays.', right: 'She walks to class on Mondays.', why: '主语是 she，一般现在时的动词要加 -s。' },
    exercise: ex('Which sentence matches a habit?', ['The bus leaves at 7:10 every Saturday.', 'The bus is leaving in this photo yesterday.', 'The bus left while I have breakfast now.', 'The bus leaving at 7:10 every Saturday.'], 'A', 'every Saturday 这种重复时间用一般现在时。D 缺少动词。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-past-time',
    level: 'A2',
    title: '一般过去时和明确时间',
    summary: '句子里有 yesterday、in 2024、last night 这种已经结束的时间，用一般过去时，不用现在完成时。',
    examples: [
      { text: 'The market opened in March 2025.', zh: '市场在 2025 年 3 月开业。时间已经点明。' },
      { text: 'I lost my key yesterday.', zh: '我昨天把钥匙弄丢了。' },
    ],
    contrast: { wrong: 'I have lost my key yesterday.', right: 'I lost my key yesterday.', why: 'yesterday 把时间说死了，不能和 have lost 一起用。' },
    exercise: ex('Choose the correct line.', ['She submitted the form yesterday.', 'She has submitted the form yesterday.', 'She submit the form yesterday.', 'She has submit the form yesterday.'], 'A', '有 yesterday 就用过去式 submitted。have 不和 yesterday 连用，submit 也不能直接跟在 has 后面。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-present-perfect',
    level: 'B1',
    title: '现在完成时：结果还在',
    summary: '现在完成时把过去的动作和现在的结果连在一起。没有明确的过去时间。已经结束的时间点要用一般过去时。',
    examples: [
      { text: 'She has lost her key, so she cannot open the lab.', zh: '她把钥匙弄丢了，所以现在打不开实验室。' },
      { text: 'I have lived here for two years.', zh: '我在这里住了两年，现在还住着。' },
    ],
    contrast: { wrong: 'She has lost her key yesterday.', right: 'She lost her key yesterday.', why: '昨天是明确过去，用 lost。没有时间、只强调现在开不了门，才用 has lost。' },
    exercise: ex('Which sentence is correct?', ['She has lost her key, so the door stays shut.', 'She has lost her key yesterday evening.', 'She lost her key, so she has cannot enter.', 'She has lose her key now.'], 'A', 'A 没有过去时间，并用结果说明现在。B 把 yesterday 和 has lost 放在一起。C、D 的动词形式不对。'),
    examLinks: ['toefl'],
  }),
  point({
    id: 'en-the',
    level: 'B1',
    title: 'the：双方都知道是哪一个',
    summary: '第一次提到一类东西可以用 a。双方都知道是哪一个，或者后面已经限定了，用 the。',
    examples: [
      { text: 'The report does not recommend a product.', zh: '这份报告没有推荐产品。the report 指正在读的那份。' },
      { text: 'She bought a fan. The fan is loud.', zh: '她买了一台风扇。第二次提到用 the。' },
    ],
    contrast: { wrong: 'A report on the desk is the one we wrote, please pass a report.', right: 'The report on the desk is the one we wrote.', why: 'on the desk 已经指出是哪一份，用 the。' },
    exercise: ex('Choose the correct line.', ['The notes for October do not explain the fall.', 'A notes for October does not explain fall.', 'Notes for the October does not explain a fall we mentioned.', 'The note for October do not explain the fall.'], 'A', 'notes 是复数，用 The notes。do not 和复数一致。B 的 a notes 单复数矛盾。'),
    examLinks: ['ielts'],
  }),
  point({
    id: 'en-comparatives',
    level: 'B1',
    title: '比较级',
    summary: '短形容词通常加 -er，再加 than。多音节形容词用 more。比较的两边要是同一类。',
    examples: [
      { text: 'North-facing roofs held more moss than south-facing roofs.', zh: '北向屋顶的苔藓比南向多。' },
      { text: 'This room is quieter than the hall.', zh: '这间屋子比大厅安静。' },
    ],
    contrast: { wrong: 'This plot is more wetter than that one.', right: 'This plot is wetter than that one.', why: 'wet 已经用了 -er，不能再加 more。' },
    exercise: ex('Choose the correct comparison.', ['The undrained plot stored more carbon than the drained plot.', 'The undrained plot stored more carboner than the drained plot.', 'The undrained plot stored carbon more than as the drained plot.', 'The undrained plot more stored carbon than the drained plot.'], 'A', 'more carbon than 是「更多的碳」。carbon 是名词，不加 -er。more 也不插在 stored 前面。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-passive',
    level: 'B1',
    title: '被动：be + 过去分词',
    summary: '当动作的承受者放在主语位置、执行者不必说出时，用 be 加过去分词。be 的时态跟着句子走。',
    examples: [
      { text: 'The fume hood is being repaired.', zh: '通风橱正在被修理。' },
      { text: 'The tools were donated by households.', zh: '工具是住户捐的。' },
    ],
    contrast: { wrong: 'The lab is repairing today.', right: 'The lab is being repaired today.', why: '实验室不是修理这个动作的发出者。正在被修理要用 is being repaired。' },
    exercise: ex('Choose the correct line.', ['The hood is being repaired, so the lab will stay closed.', 'The hood is repairing, so the lab will stay closed.', 'The hood being repair, so the lab closed stay.', 'The hood has being repaired yesterday.'], 'A', 'A 是现在进行被动。B 变成了通风橱自己在修理。D 的 has being 和 yesterday 都不对。'),
    examLinks: ['toefl'],
  }),
  point({
    id: 'en-conditional',
    level: 'B1',
    title: '第一条件句',
    summary: 'if 从句说可能发生的条件，用一般现在时。主句说结果，用 will 或祈使句。不要在 if 里再加 will。',
    examples: [
      { text: 'If you want a locker, send the form before Friday.', zh: '如果你想要柜子，周五前把表交来。' },
      { text: 'If it rains, the market will move indoors.', zh: '如果下雨，市场会挪到室内。' },
    ],
    contrast: { wrong: 'If it will rain, the market moves.', right: 'If it rains, the market will move indoors.', why: 'will 放在结果里，不放在 if 里。' },
    exercise: ex('Choose the correct line.', ['If you finish before 17:00, the office will still be open.', 'If you will finish before 17:00, the office is open yesterday.', 'If you finished before 17:00, the office will opens.', 'If you finish before 17:00, the office open.'], 'A', 'if 用现在时 finish，主句用 will be。B 在 if 里用了 will，还混进 yesterday。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-relative',
    level: 'B2',
    title: 'who 和 which',
    summary: 'who 指人，which 指物。关系从句紧跟它修饰的名词，用来指出是哪一个。',
    examples: [
      { text: 'The tutor who lives in Orm stays for the discussion.', zh: '住在 Orm 的那位导师会留下参加讨论。' },
      { text: 'The report which the university published names no product.', zh: '大学发表的那份报告没有点名任何产品。' },
    ],
    contrast: { wrong: 'The tutor which stays for the discussion lives in Orm.', right: 'The tutor who stays for the discussion lives in Orm.', why: 'tutor 是人，用 who，不用 which。' },
    exercise: ex('Choose the correct line.', ['The volunteer who checks the tools is Ruth.', 'The volunteer which checks the tools is Ruth.', 'The tools who came from households are new.', 'The volunteer who check the tools are Ruth.'], 'A', '人用 who，动词 checks 对单数 volunteer。工具不能用 who。'),
    examLinks: ['ielts'],
  }),
  point({
    id: 'en-however',
    level: 'B2',
    title: 'however 连接相反的两句',
    summary: 'however 连接两个完整句子，表示转折。常见写法是前句用分号，however 后面加逗号。它不是 but 那样直接粘在同一个句子中间而不加标点。',
    examples: [
      { text: 'The room is small; however, it has a large window.', zh: '房间很小，不过有一扇大窗。' },
      { text: 'The path was busy. However, the report does not ask to close it.', zh: '小路很忙。不过报告并没有要求关闭它。' },
    ],
    contrast: { wrong: 'The room is small however it has a window.', right: 'The room is small; however, it has a window.', why: '两个完整句之间不能只丢一个 however。用分号，或拆成两句。' },
    exercise: ex('Choose the correct line.', ['The room is small; however, it has a large window.', 'The room is small however it has a large window.', 'The room is small, however it has a large window.', 'However, the room is small it has a large window.'], 'A', 'A 的分号和逗号把两句分开。B 和 C 把两个完整句粘在一起。D 的后半没有连接。'),
    examLinks: ['toefl', 'ielts'],
  }),
  point({
    id: 'en-modals',
    level: 'B1',
    title: 'must 和 have to',
    summary: 'must 和 have to 都可以说「必须」。否定不一样：must not 是不许，do not have to 是不必。',
    examples: [
      { text: 'Visitors must not pick the plants.', zh: '访客不许采摘这些植物。' },
      { text: 'You do not have to book if you are a pupil in the class.', zh: '如果你是班上的学生，就不必预约。' },
    ],
    contrast: { wrong: 'You must not book; booking is optional.', right: 'You do not have to book; booking is optional.', why: '「不必」是 do not have to。must not 是禁止。' },
    exercise: ex('The notice says booking is optional. Which line matches?', ['You do not have to book.', 'You must not book.', 'You have to not a booking.', 'You must booking.'], 'A', '可选就是不必预约，用 do not have to。must not 会变成禁止预约。'),
    examLinks: ['ielts', 'toefl'],
  }),
  point({
    id: 'en-word-form',
    level: 'B2',
    title: '词性不能互换',
    summary: '同一个词根可以有名词、动词、形容词。句子缺的是哪一类，就用哪一类。不要只看中文意思接近。',
    examples: [
      { text: 'The explanation is clear.', zh: '说明很清楚。explanation 是名词。' },
      { text: 'Please explain the budget.', zh: '请解释预算。explain 是动词。' },
    ],
    contrast: { wrong: 'Please explanation the budget.', right: 'Please explain the budget.', why: '祈使句需要动词 explain，不是名词 explanation。' },
    exercise: ex('Choose the correct line.', ['Please explain the budget before the vote.', 'Please explanation the budget before the vote.', 'Please explanatory the budget before the vote.', 'Please explained the budget before the vote as a command.'], 'A', '祈使句用动词原形 explain。explanation 是名词，explanatory 是形容词，explained 不能这样开头下命令。'),
    examLinks: ['ielts', 'toefl'],
  }),
]
