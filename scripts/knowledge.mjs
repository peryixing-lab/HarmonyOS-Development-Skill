import { readFileSync } from 'node:fs'

const directory = new URL('../references/openharmony-knowledge/', import.meta.url)
const usage = `用法：node scripts/knowledge.mjs <命令>
  catalog [关键词]         列出离线文档主题
  search <关键词> [...]    搜索主题、标签和小节标题
  read <主题 ID> [小节]     查看目录，或按编号、标题读取小节
`

function summarize({ id, title, kind, module, since, file, sourceUrl, excerpted }) {
  return { id, title, kind, module, since, file, sourceUrl, excerpted: Boolean(excerpted) }
}

function openDocument(entry) {
  const lines = readFileSync(new URL(entry.file, directory), 'utf8').split(/\r?\n/)
  const headings = []
  for (const [index, line] of lines.entries()) {
    const match = /^(#{2,6})\s+(.+)$/.exec(line)
    if (match) headings.push({ number: headings.length + 1, level: match[1].length, title: match[2].trim(), line: index + 1 })
  }
  return { lines, headings }
}

function topicText(entry) {
  return [entry.id, entry.title, entry.module, entry.kind, ...entry.tags].join(' ').toLowerCase()
}

function findTopics(entries, keywords) {
  return entries.map((entry) => {
    const topic = topicText(entry)
    const { headings } = openDocument(entry)
    const matches = headings.filter(({ title }) => keywords.some((word) => title.toLowerCase().includes(word)))
    const score = keywords.filter((word) => topic.includes(word)).length * 5 + Math.min(matches.length, 4)
    return { ...summarize(entry), score, matchedHeadings: matches.slice(0, 5) }
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score)
}

function readTopic(entries, id, section) {
  const entry = entries.find((item) => item.id.toLowerCase() === id.toLowerCase())
  if (!entry) throw new Error(`没有找到主题 ${id}。先通过 catalog 或 search 查看主题 ID。`)
  const { lines, headings } = openDocument(entry)
  const topic = summarize(entry)
  if (section === undefined) {
    const introEnd = headings.length ? headings[0].line - 1 : lines.length
    return { ...topic, headings, intro: lines.slice(0, introEnd).join('\n').trim() }
  }
  const query = section.trim().toLowerCase()
  const heading = /^\d+$/.test(query)
    ? headings[Number(query) - 1]
    : headings.find(({ title }) => title.toLowerCase() === query) ?? headings.find(({ title }) => title.toLowerCase().includes(query))
  if (!heading) throw new Error(`主题 ${id} 中没有找到小节 ${section}。先读取主题目录查看可用小节。`)
  const next = headings.slice(heading.number).find(({ level }) => level <= heading.level)
  return { ...topic, section: heading, content: lines.slice(heading.line - 1, next ? next.line - 1 : lines.length).join('\n').trimEnd() }
}

function run([command, ...args]) {
  if (command === undefined || command === '-h' || command === '--help') {
    console.log(usage.trimEnd())
    return
  }
  const { entries, attribution, license, licenseUrl, source, sourceSha } = JSON.parse(readFileSync(new URL('index.json', directory), 'utf8'))
  let result
  switch (command) {
    case 'catalog': {
      if (args.length > 1) throw new Error('catalog 最多接受一个筛选关键词。')
      const filter = (args[0] ?? '').trim().toLowerCase()
      const topics = entries.filter((entry) => topicText(entry).includes(filter)).map(summarize)
      result = { total: topics.length, entries: topics }
      break
    }
    case 'search': {
      const keywords = args.map((word) => word.trim().toLowerCase()).filter(Boolean)
      if (keywords.length === 0) throw new Error('search 需要至少一个非空关键词。')
      const matches = findTopics(entries, keywords)
      result = { total: matches.length, results: matches.slice(0, 8) }
      break
    }
    case 'read':
      if (args.length < 1 || args.length > 2 || args.some((word) => !word.trim())) {
        throw new Error('read 需要主题 ID，可附加一个小节编号或标题。')
      }
      result = readTopic(entries, ...args.map((word) => word.trim()))
      break
    default:
      throw new Error(`未知命令 ${command}。运行 --help 查看用法。`)
  }
  console.log(JSON.stringify({ ...result, attribution, license, licenseUrl, source, sourceSha }, null, 2))
}

try {
  run(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
