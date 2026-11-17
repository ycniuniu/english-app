# 刷题和语法的来源与许可

个人把官方文件导入自己的浏览器，不等于这些文件可以再分发，也不等于私的使用覆盖了版权限制。本仓库不收录官方试题全文和音频。

JLPT 官网样题页提供 2012 与 2018 两集练习册的节选 PDF 和正答表（https://www.jlpt.jp/e/samples/sampleindex.html）。付费的公式問題集全书由凡人社销售，不在本仓库，应用也不会去下载。网站政策里，听力音频和注明的部分第三方作品不能按同一条转载许可处理（https://www.jlpt.jp/policy.html）。

雅思和托福的公开样题、熟悉卷、2026 练习套只在界面上给出取得说明。用户自己保存的文件留在 IndexedDB，不进入 git。

# 内置原创练习的来源与许可

内置题目和语法讲解都是本应用为练习写的原创内容，许可标识是 `kaikou-original-practice-2026`。它们不是官方真题，也不是官方样题的改写。公开网页可以浏览，不等于可以把原文复制进应用。下面这些页面只用来核对「现在考试里有哪些题型」，没有把其中的文章、题目或分数换算表抄进来。

核对日期：2026-11-17。

| 考试 | 用来核对的公开页面 | 嵌入了原文吗 | 结论 |
| --- | --- | --- | --- |
| 雅思 IELTS Academic | [Reading format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading)、[Sample questions](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test) | 否 | 样题版权属于主办方。应用里只有原创文字题。没有收录分数换算。 |
| 托福 TOEFL iBT | [Test content](https://www.ets.org/toefl/test-takers/ibt/about/content.html)、[Updated overview PDF](https://www.ets.org/pdfs/toefl/toefl-ibt-test-overview.pdf)、[2026 specifications PDF](https://www.ets.org/pdfs/toefl/toefl-ibt-test-specifications-2026.pdf) | 否 | 对照的是 2026 年公开说明里的任务名称。ETS 例题没有嵌入。说明文件自己写过发布前题量可能微调。没有分数换算。 |
| 日语 JLPT | [試験科目と問題の構成](https://www.jlpt.jp/guideline/testsections.html)、[英文对照](https://www.jlpt.jp/e/guideline/testsections.html) | 否 | 只对照各级有哪些大题。官方样题没有嵌入。练习分数不是合格分。 |

日语等级按 JLPT 的 N5、N4、N3、N2、N1 实现。这是对「中国进行的日语等级考试」的理解：国内最常参加的是 JLPT。这里不包括日语专业四级、专业八级，也不包括大学日语四六级。

未实现、题量为 0 的部分在应用里单独标出，不能看成已经练完：

- 雅思：听力、写作、口语；阅读里的信息配对、特征配对、句尾配对、填空、图示标签。
- 托福：听力、口语；写作里的邮件和学术讨论。语序题只是四选一，不是官方的组句界面，也不给写作分。选词补全不是官方的补字母界面。
- JLPT：全部听力；N2 的词的构成；N1/N3 的长文；N1/N2 的统合理解和主张理解。N1 没有表记题，N5 没有用法题，因为官方大题表里就没有。
