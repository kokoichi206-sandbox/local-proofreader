// contenteditable から「AI に渡すプレーンテキスト」と「文字オフセット→DOM Range」変換を提供する。
// 不変条件: textWithOffsets が作る text の各 code unit インデックスは、そのまま offsetToRange に渡せる
// (抽出と復元で完全に同一の走査ロジックを使う = 対称性)。改行は block 境界と <br> を 1 個の '\n' に正規化。
// textContent(改行を落とす)/innerText(reflow・レイアウト依存)は使わない。

export interface NodeSpan {
  node: Text
  textStart: number // text 内の開始(包含)
  textEnd: number // text 内の終了(排他)
}

export interface TextWithOffsets {
  text: string
  nodes: NodeSpan[] // 実テキストノードのみ(合成 '\n' は text に含むが span は持たない)
}

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'SECTION',
  'ARTICLE',
  'TR',
  'TD',
  'TH',
  'TABLE',
  'FIGURE',
])
const BLOCK_DISPLAYS = new Set([
  'block',
  'flex',
  'grid',
  'list-item',
  'table',
  'table-row',
  'table-cell',
  'flow-root',
])

function isBlockElement(el: Element): boolean {
  if (BLOCK_TAGS.has(el.tagName)) return true
  return BLOCK_DISPLAYS.has(getComputedStyle(el).display)
}

function isHidden(el: Element): boolean {
  const s = getComputedStyle(el)
  return s.display === 'none' || s.visibility === 'hidden'
}

export function textWithOffsets(root: HTMLElement): TextWithOffsets {
  const nodes: NodeSpan[] = []
  let text = ''
  let pendingNewline = false // ブロック/<br> 後に保留。実テキスト出現時に 1 個だけ確定(連続は合体)。
  let textEmitted = false // 先頭の余分な改行を避ける

  const emitText = (node: Text): void => {
    if (node.data.length === 0) return
    if (pendingNewline && textEmitted) text += '\n'
    pendingNewline = false
    const start = text.length
    text += node.data
    nodes.push({ node, textStart: start, textEnd: text.length })
    textEmitted = true
  }

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      emitText(node as Text)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    if (el.tagName === 'BR') {
      pendingNewline = true
      return
    }
    if (isHidden(el)) return

    const block = isBlockElement(el)
    if (block && textEmitted) pendingNewline = true
    for (let c = el.firstChild; c; c = c.nextSibling) visit(c)
    if (block && textEmitted) pendingNewline = true
  }

  for (let c = root.firstChild; c; c = c.nextSibling) visit(c)
  return { text, nodes }
}

// サロゲートペアの中間に境界が落ちないようクランプ(絵文字の分割防止)。範囲は内側へ寄せる。
function clampSurrogate(data: string, local: number, dir: 1 | -1): number {
  if (local <= 0 || local >= data.length) return local
  const here = data.charCodeAt(local)
  const prev = data.charCodeAt(local - 1)
  const midPair =
    here >= 0xdc00 && here <= 0xdfff && prev >= 0xd800 && prev <= 0xdbff
  return midPair ? local + dir : local
}

// グローバル offset を (テキストノード, ノード内 offset) に解決する。
// 改行ギャップやノード境界に当たった場合、start は後続ノード先頭へ、end は手前ノード末尾へ寄せる。
function locate(
  tw: TextWithOffsets,
  offset: number,
  isEnd: boolean,
): { node: Text; local: number } | null {
  const { text, nodes } = tw
  if (nodes.length === 0) return null
  const o = Math.max(0, Math.min(offset, text.length))

  for (const span of nodes) {
    if (o >= span.textStart && o < span.textEnd) {
      return { node: span.node, local: o - span.textStart }
    }
  }
  // ギャップ('\n')/末尾/ノード境界
  if (isEnd) {
    let prev: NodeSpan | null = null
    for (const span of nodes) {
      if (span.textEnd <= o) prev = span
      else break
    }
    if (prev) return { node: prev.node, local: prev.node.data.length }
    return { node: nodes[0].node, local: 0 }
  }
  for (const span of nodes) {
    if (span.textStart >= o) return { node: span.node, local: 0 }
  }
  const last = nodes[nodes.length - 1]
  return { node: last.node, local: last.node.data.length }
}

export function offsetToRange(
  tw: TextWithOffsets,
  start: number,
  end: number,
): Range | null {
  const a = locate(tw, start, false)
  const b = locate(tw, end, true)
  if (!a || !b) return null

  const startLocal = clampSurrogate(a.node.data, a.local, 1)
  const endLocal = clampSurrogate(b.node.data, b.local, -1)

  try {
    const range = document.createRange()
    range.setStart(a.node, Math.min(startLocal, a.node.data.length))
    range.setEnd(b.node, Math.min(endLocal, b.node.data.length))
    return range
  } catch {
    return null
  }
}
