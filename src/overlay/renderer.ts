import type { Correction } from '../state/types'
import type { ProofreadTarget } from '../input/detect'
import type { OverlayCallbacks } from './types'
import { Mirror } from './mirror'
import { Tooltip } from './tooltip'

const Z_CONTAINER = '2147483646'
const UNDERLINE_THICKNESS = 3
// 波線のヒット領域の高さ。行全体を覆うと文字本体のクリックが入力欄に届かないため、下端の細い帯にする。
const HOVER_HEIGHT = 8

// 赤い波線(spellcheck 風)を SVG データ URI で描く。# は encodeURIComponent で安全化。
const WAVY_URL = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='M0 2.5 Q1.5 0.5 3 2.5 T6 2.5' stroke='#e5484d' fill='none' stroke-width='1'/></svg>",
)}`

// textarea/input の上に透明なオーバーレイを重ね、指摘範囲に波線を描く。
// 座標系: コンテナを入力欄の border-box に position:fixed で合わせ、
// ハイライト層を translate(-scrollLeft,-scrollTop) でスクロール同期する。
export class OverlayRenderer {
  private readonly container: HTMLDivElement
  private readonly layer: HTMLDivElement
  private readonly mirror: Mirror
  private readonly tooltip: Tooltip
  private readonly resizeObserver: ResizeObserver
  private text = ''
  private corrections: Correction[] = []
  private repositionScheduled = false

  constructor(
    private readonly target: ProofreadTarget,
    callbacks: OverlayCallbacks,
  ) {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      margin: '0',
      padding: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: Z_CONTAINER,
    })
    this.layer = document.createElement('div')
    Object.assign(this.layer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      transformOrigin: '0 0',
    })
    this.container.appendChild(this.layer)
    document.body.appendChild(this.container)

    this.mirror = new Mirror(target, this.container)
    this.tooltip = new Tooltip(callbacks)

    this.target.addEventListener('scroll', this.onTargetScroll, {
      passive: true,
    })
    window.addEventListener('scroll', this.onReposition, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', this.onReposition, { passive: true })
    // サイズ/折り返し条件が変わったら style を取り直して再測定する。
    this.resizeObserver = new ResizeObserver(() => {
      this.mirror.sync()
      this.position()
      this.render()
    })
    this.resizeObserver.observe(this.target)

    this.position()
  }

  setData(text: string, corrections: Correction[]): void {
    this.text = text
    this.corrections = corrections
    this.render()
  }

  private readonly onTargetScroll = (): void => {
    this.syncScroll()
  }

  private readonly onReposition = (): void => {
    if (this.repositionScheduled) return
    this.repositionScheduled = true
    requestAnimationFrame(() => {
      this.repositionScheduled = false
      this.position()
    })
  }

  // コンテナを入力欄の現在の viewport 矩形に合わせる(reflow を伴うので頻発させない)。
  private position(): void {
    const r = this.target.getBoundingClientRect()
    Object.assign(this.container.style, {
      top: `${r.top}px`,
      left: `${r.left}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    })
    this.syncScroll()
  }

  // 入力欄内スクロールの追従は transform 更新のみ(安い)。再測定はしない。
  private syncScroll(): void {
    this.layer.style.transform = `translate(${-this.target.scrollLeft}px, ${-this.target.scrollTop}px)`
  }

  private render(): void {
    this.layer.textContent = ''
    for (const correction of this.corrections) {
      const rects = this.mirror.measureRange(
        this.text,
        correction.start,
        correction.end,
      )
      for (const rect of rects) {
        this.layer.appendChild(this.buildUnderline(correction, rect))
      }
    }
  }

  private buildUnderline(
    correction: Correction,
    rect: DOMRect,
  ): HTMLDivElement {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute',
      left: `${rect.left}px`,
      top: `${rect.top + rect.height - HOVER_HEIGHT}px`,
      width: `${rect.width}px`,
      height: `${HOVER_HEIGHT}px`,
      pointerEvents: 'auto',
      cursor: 'pointer',
      backgroundImage: `url("${WAVY_URL}")`,
      backgroundRepeat: 'repeat-x',
      backgroundPosition: 'left bottom',
      backgroundSize: `6px ${UNDERLINE_THICKNESS}px`,
    })
    el.addEventListener('mouseenter', () => this.tooltip.show(correction, el))
    el.addEventListener('mouseleave', () => this.tooltip.scheduleHide())
    el.addEventListener('click', () => this.tooltip.show(correction, el))
    return el
  }

  dispose(): void {
    this.target.removeEventListener('scroll', this.onTargetScroll)
    window.removeEventListener('scroll', this.onReposition, { capture: true })
    window.removeEventListener('resize', this.onReposition)
    this.resizeObserver.disconnect()
    this.mirror.dispose()
    this.tooltip.dispose()
    this.container.remove()
  }
}
