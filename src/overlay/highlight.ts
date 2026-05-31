// CSS Custom Highlight API で波線を描く共有レジストリ。
// DOM を一切改変せず paint 層で描画するため、contenteditable のエディタ state を汚さない。
// ::highlight() のスタイル規則は固定名 1 つに対して 1 度だけ注入し、複数の入力欄の Range を
// owner 単位で集約して 1 つの Highlight にまとめる(名前は固定なので CSS 規則と対応が取れる)。
const HIGHLIGHT_NAME = 'local-proofreader-error'
const ERROR_COLOR = '#e5484d'

const owners = new Map<object, Range[]>()
let styleInjected = false

export function isHighlightSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  )
}

function ensureStyle(): void {
  if (styleInjected || !isHighlightSupported()) return
  const style = document.createElement('style')
  style.textContent = `::highlight(${HIGHLIGHT_NAME}){text-decoration: underline wavy ${ERROR_COLOR}; text-decoration-thickness: 2px;}`
  document.head.appendChild(style)
  styleInjected = true
}

function rebuild(): void {
  if (!isHighlightSupported()) return
  const all: Range[] = []
  for (const ranges of owners.values()) all.push(...ranges)
  if (all.length === 0) {
    CSS.highlights.delete(HIGHLIGHT_NAME)
    return
  }
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...all))
}

export function setHighlightRanges(owner: object, ranges: Range[]): void {
  ensureStyle()
  owners.set(owner, ranges)
  rebuild()
}

export function clearHighlightOwner(owner: object): void {
  if (owners.delete(owner)) rebuild()
}
