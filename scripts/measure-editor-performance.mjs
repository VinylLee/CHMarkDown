import { performance } from 'node:perf_hooks'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const requestedRuns = Number(process.argv[2] ?? 7)
const runs = Number.isInteger(requestedRuns) && requestedRuns >= 3 ? requestedRuns : 7
const lineCount = 2000
const editCount = 24
const dom = new JSDOM('')
const purify = createDOMPurify(dom.window)
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
const outlineMarkdown = new MarkdownIt({ html: false })

markdown.core.ruler.push('performance_source_map', (state) => {
  for (const token of state.tokens) {
    if (token.nesting === -1 || token.map === null) continue
    token.attrSet('data-source-line', String(token.map[0] + 1))
    token.attrSet('data-source-end-line', String(Math.max(token.map[0] + 1, token.map[1])))
  }
})

const baseContent = Array.from({ length: lineCount }, (_, index) => {
  if (index % 40 === 0) return `## 第 ${index / 40 + 1} 节`
  if (index % 9 === 0) return `- 列表项 ${index}，包含 **加粗文字** 与 [链接](https://example.com/${index})。`
  return `第 ${index + 1} 行：这是一段用于大文档性能测量的 Markdown 文本，包含 English words ${index}。`
}).join('\n\n')
const edits = Array.from(
  { length: editCount },
  (_, index) => `${baseContent}\n追加输入 ${'文字'.repeat(index + 1)}`,
)

const syntaxPattern = /[#*>`\[\]!()~\-_]/g
const linkPattern = /\[([^\]]*)\]\([^)]*\)/g
const cjkPattern = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g
const wordPattern = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g

function renderPreview(content) {
  return purify.sanitize(markdown.render(content), {
    ADD_ATTR: ['data-source-line', 'data-source-end-line'],
  }).length
}

function countWords(content) {
  const plain = content.replace(linkPattern, '$1').replace(syntaxPattern, ' ')
  return (plain.match(cjkPattern)?.length ?? 0) + (plain.match(wordPattern)?.length ?? 0)
}

function countHeadings(content) {
  return outlineMarkdown.parse(content, {}).reduce(
    (count, token) => count + (token.type === 'heading_open' ? 1 : 0),
    0,
  )
}

function measure(callback) {
  const startedAt = performance.now()
  const checksum = callback()
  return { milliseconds: performance.now() - startedAt, checksum }
}

function eagerPipeline() {
  let checksum = 0
  for (const content of edits) {
    checksum += renderPreview(content)
    checksum += countWords(content)
    checksum += countHeadings(content)
  }
  return checksum
}

function coalescedPipeline() {
  let checksum = 0
  // 对应应用中的分层合并：预览 240ms、统计 420ms、大纲 540ms 最长等待。
  for (const index of [5, 11, 17, 23]) checksum += renderPreview(edits[index])
  for (const index of [7, 15, 23]) checksum += countWords(edits[index])
  for (const index of [11, 23]) checksum += countHeadings(edits[index])
  return checksum
}

eagerPipeline()
coalescedPipeline()

const eagerTimes = []
const coalescedTimes = []
for (let index = 0; index < runs; index += 1) {
  const eager = measure(eagerPipeline)
  const coalesced = measure(coalescedPipeline)
  if (eager.checksum <= 0 || coalesced.checksum <= 0) throw new Error('性能测量结果无效')
  eagerTimes.push(eager.milliseconds)
  coalescedTimes.push(coalesced.milliseconds)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const eagerMedian = median(eagerTimes)
const coalescedMedian = median(coalescedTimes)
const improvement = (1 - coalescedMedian / eagerMedian) * 100

console.table({
  '每次输入立即全量计算': {
    runs: eagerTimes.map((value) => value.toFixed(1)).join(', '),
    medianMs: eagerMedian.toFixed(1),
  },
  '1.1.0 合并派生计算': {
    runs: coalescedTimes.map((value) => value.toFixed(1)).join(', '),
    medianMs: coalescedMedian.toFixed(1),
  },
})
console.log(`中位耗时改善：${improvement.toFixed(1)}%（${lineCount} 行，${editCount} 次连续输入）`)
