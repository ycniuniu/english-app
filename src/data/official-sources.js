export const OFFICIAL_SOURCES = [
  {
    id: 'jlpt',
    name: '日语 JLPT',
    summary: '个人把官网允许下载的正答表和原卷 PDF 放进这台浏览器。应用不内置这些原题。',
    linkAvailable: [
      {
        id: 'paid-workbooks',
        title: '公式問題集两集',
        detail: '2012 年刊行和 2018 年 Vol.2，由凡人社销售。各有 N1 到 N5，合计约 10 套。研究里把两集答案表点算为约 1001 道。这是付费书，本应用不下载、不内置，也不把 1001 算进已导入题量。',
        url: 'https://www.jlpt.jp/e/reference/books.html',
        imported: false,
      },
      {
        id: 'site-pdfs',
        title: '官网公开的 2012 与 2018 节选 PDF',
        detail: 'jlpt.jp 的样题页提供两集的试题节选、正答表、答题卡和听力脚本 PDF，以及听力 mp3。这不是付费全书。本应用能解析这种正答表的表格，并让你对着自己保存的原卷 PDF 作答。',
        url: 'https://www.jlpt.jp/e/samples/sampleindex.html',
        imported: false,
      },
    ],
    supported: [
      '正答表 PDF：按页面坐标把题号和 1–4 的答案配成答题卡。配不上的行会标出来，不猜。',
      '原卷 PDF：只在本地翻页。不从版面里抽题干，避免和答案错位。',
      '校验 JSON（kaikou-official-key 版本 1）：你自己整理的题号、选项和答案。',
      '本地 mp3：只播放你选中的文件。不从网上拉音频。',
    ],
    unsupported: [
      '不把付费全书自动下载进来。',
      '不从试题 PDF 自动生成题目文字。',
      '正答表没有解析时，不编一条冒充官方的解析。',
      '听力音频和部分 N1、N2 阅读含第三方作品。网站的转载许可不自动覆盖它们。',
    ],
    copyright: '个人从官网保存文件、只放在自己的浏览器里，不等于可以再公开，也不等于本应用获得了复制权。私的使用不是一张无条件免责声明。',
  },
  {
    id: 'ielts',
    name: '雅思 IELTS',
    summary: '复杂 PDF 不自动抽题。你自己下载公开样题或熟悉卷后，用原卷加答题卡 JSON 在本地练。',
    linkAvailable: [
      {
        id: 'format',
        title: 'Academic 阅读题型说明',
        detail: '只用来核对题型名称。页面上的样题没有收进应用。',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
        imported: false,
      },
      {
        id: 'samples',
        title: '公开样题索引',
        detail: '主办方公开的样题和熟悉卷要你自己下载。下载到本地后才能导入。链接本身不是已导入题量。',
        url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
        imported: false,
      },
    ],
    supported: [
      '本地原卷 PDF 翻页。',
      'kaikou-official-key JSON：阅读、听力选择题可以对答案。',
      '写作、口语：只保存你写的或记下的答案，可附上你自己填进 JSON 的参考材料。',
    ],
    unsupported: [
      '不从雅思 PDF 自动抽题。',
      '不自动批改写作和口语。',
      '不换算雅思分数。',
      '不把公开可浏览当成可以复制进仓库。',
    ],
    copyright: '样题版权属于主办方。导入文件只留在本机。',
  },
  {
    id: 'toefl',
    name: '托福 TOEFL iBT',
    summary: '2026 年公开练习按你自己下载到的文件导入。应用里没有这些套题。',
    linkAvailable: [
      {
        id: 'prepare',
        title: 'ETS 备考页',
        detail: '任务说明里记录过学生用 2 套、教师用 5 套。本次没有重新下载这些套题，也没有绕过登录。需要账号的文件请你自己登录后保存，再从本机导入。',
        url: 'https://www.ets.org/toefl/test-takers/ibt/prepare.html',
        imported: false,
      },
    ],
    supported: [
      '本地原卷 PDF 或你整理的 JSON 题库。',
      '听力只播放你另外选择的本地音频。',
      '写作、口语只保存个人答案和你提供的参考，不评分。',
    ],
    unsupported: [
      '不自动抽题，不自适应组卷。',
      '不虚构托福分数。',
      '不代你登录 ETS。',
    ],
    copyright: 'ETS 材料的许可以你下载时页面上的条件为准。本仓库不收录原题和音频。',
  },
]
