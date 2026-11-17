# 个人题库导入模板

这些例子是开口自己编的，用来说明文件格式。不是雅思、托福或 JLPT 的题目，也不要把官方原题放进仓库。

导入后的题目只存在这台浏览器的 IndexedDB（`kaikou.official.v1`）里，不会上传。右上角的 localStorage 备份不含这些题。

## JSON

文件要有 `format`、`version` 和 `exam`。`exam` 只能是 `ielts`、`toefl` 或 `jlpt`。选择题的 `answer` 必须等于某个 `choices`。`writing` 和 `speaking` 可以没有选项，应用只保存你写下的答案，不评分。

```json
{
  "format": "kaikou-official-key",
  "version": 1,
  "exam": "ielts",
  "source": {
    "title": "自制示例",
    "level": "",
    "edition": "example"
  },
  "items": [
    {
      "id": "example-1",
      "stem": "自制题：Which word means 书？",
      "section": "reading",
      "skill": "reading",
      "choices": ["book", "water", "train"],
      "answer": "book",
      "explanation": ""
    },
    {
      "id": "example-2",
      "stem": "自制题：用一句话写你今天做了什么。",
      "section": "writing",
      "skill": "writing",
      "choices": [],
      "reference": "这里只是格式示例，不会自动打分。"
    }
  ]
}
```

## CSV

第一行必须是表头。一份文件只能有一种 `exam`。用引号包住含逗号的格子，引号里的引号写成两个引号。

```csv
exam,id,section,skill,stem,choice1,choice2,choice3,choice4,answer,explanation,reference
ielts,example-1,reading,reading,自制题：Which word means 书？,book,water,train,,book,,
ielts,example-2,writing,writing,自制题：用一句话写你今天做了什么。,,,,,,"这里只是格式示例，不会自动打分。"
```

`choice1` 到 `choice4` 可以留空。写作题不要填 `answer`。刷题页导入后，在「已导入」里点「继续练」即可选择这套题。
