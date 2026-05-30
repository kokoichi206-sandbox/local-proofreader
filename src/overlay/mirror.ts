import type { ProofreadTarget } from '../input/detect'
import { copyComputedStyles } from './cssCopy'

// ゼロ幅スペース: 空 span や末尾改行の測定崩れを防ぐためのプレースホルダ。
const ZWSP = '​'

// textarea/input の文字レイアウトを不可視 div に複製し、文字オフセット範囲の矩形を測る。
// 入力欄自体は一切変更しない(コンセプト §5)。
export class Mirror {
  private readonly el: HTMLDivElement

  constructor(
    private readonly target: ProofreadTarget,
    parent: HTMLElement,
  ) {
    this.el = document.createElement('div')
    parent.appendChild(this.el)
    this.sync()
  }

  // textarea の computed style を複製し、mirror のジオメトリを合わせる。
  // テキスト変更ではなく、フォント/サイズ/折り返し条件が変わったときに呼ぶ。
  sync(): void {
    this.el.style.cssText = ''
    const computed = copyComputedStyles(this.target, this.el)

    this.el.style.position = 'absolute'
    this.el.style.top = '0'
    this.el.style.left = '0'
    this.el.style.margin = '0'
    this.el.style.visibility = 'hidden'
    this.el.style.pointerEvents = 'none'
    this.el.style.overflow = 'hidden'
    this.el.style.boxSizing = 'border-box'

    const bl = parseFloat(computed.borderLeftWidth) || 0
    const br = parseFloat(computed.borderRightWidth) || 0
    // clientWidth はスクロールバーと border を除いた幅。border-box では左右 border を足し戻すと
    // textarea の実コンテンツ幅と一致し、折り返し位置がズレない。
    this.el.style.width = `${this.target.clientWidth + bl + br}px`
    this.el.style.height = 'auto'

    const isInput = this.target instanceof HTMLInputElement
    // 単一行 input は折り返さない。textarea は折り返す。
    this.el.style.whiteSpace = isInput ? 'pre' : 'pre-wrap'
    this.el.style.overflowWrap = isInput ? 'normal' : 'break-word'
    this.el.style.wordWrap = isInput ? 'normal' : 'break-word'
  }

  // [start,end) に対応する矩形群を overlay コンテナ左上基準で返す。
  // 折り返した範囲は行ごとに複数の矩形になる。
  measureRange(text: string, start: number, end: number): DOMRect[] {
    // 末尾改行 quirk: div は末尾の \n を畳むが textarea は空行を描く。測定用に番兵を足す。
    const safe = text.endsWith('\n') ? text + ZWSP : text

    this.el.textContent = ''
    this.el.appendChild(document.createTextNode(safe.slice(0, start)))
    const span = document.createElement('span')
    span.textContent = safe.slice(start, end) || ZWSP
    this.el.appendChild(span)
    this.el.appendChild(document.createTextNode(safe.slice(end)))

    const origin = this.el.getBoundingClientRect()
    return Array.from(span.getClientRects()).map(
      (r) =>
        new DOMRect(
          r.left - origin.left,
          r.top - origin.top,
          r.width,
          r.height,
        ),
    )
  }

  dispose(): void {
    this.el.remove()
  }
}
