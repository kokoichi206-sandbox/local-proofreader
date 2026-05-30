import type { Correction } from '../state/types'
import type { OverlayCallbacks } from './types'
import { Tooltip } from './tooltip'
import { textWithOffsets, offsetToRange } from '../input/plainText'
import {
  setHighlightRanges,
  clearHighlightOwner,
  isHighlightSupported,
} from './highlight'

const Z_CONTAINER = '2147483646'
const HOVER_HEIGHT = 8

// contenteditable 用の描画。波線は CSS Custom Highlight API(DOM 非改変)で描き、
// hover/click のヒット領域だけ getClientRects の透明矩形で重ねる(Highlight API はヒット領域を持たない)。
export class ContentEditableRenderer {
  private readonly container: HTMLDivElement
  private readonly tooltip: Tooltip
  private items: { correction: Correction; range: Range }[] = []
  private repositionScheduled = false

  constructor(
    private readonly root: HTMLElement,
    callbacks: OverlayCallbacks,
  ) {
    if (!isHighlightSupported()) {
      console.warn(
        '[local-proofreader] CSS Custom Highlight API 非対応のため波線を描画できません(Chrome 105+ が必要)。',
      )
    }
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: Z_CONTAINER,
    })
    document.body.appendChild(this.container)
    this.tooltip = new Tooltip(callbacks)

    window.addEventListener('scroll', this.onReposition, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', this.onReposition, { passive: true })
  }

  setData(_text: string, corrections: Correction[]): void {
    // 現在の DOM から Range を作り直す(編集でテキストノードが再生成され Range が陳腐化するため)。
    const tw = textWithOffsets(this.root)
    this.items = []
    for (const correction of corrections) {
      const range = offsetToRange(tw, correction.start, correction.end)
      if (range && !range.collapsed) this.items.push({ correction, range })
    }
    setHighlightRanges(
      this,
      this.items.map((i) => i.range),
    )
    this.drawHitAreas()
  }

  private readonly onReposition = (): void => {
    if (this.repositionScheduled) return
    this.repositionScheduled = true
    requestAnimationFrame(() => {
      this.repositionScheduled = false
      // 波線(Highlight)はレイアウト追従するので再設定不要。ヒット矩形だけ取り直す。
      this.drawHitAreas()
    })
  }

  private drawHitAreas(): void {
    this.container.textContent = ''
    for (const { correction, range } of this.items) {
      for (const rect of Array.from(range.getClientRects())) {
        this.container.appendChild(this.buildHit(correction, rect))
      }
    }
  }

  private buildHit(correction: Correction, rect: DOMRect): HTMLDivElement {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute',
      left: `${rect.left}px`,
      top: `${rect.bottom - HOVER_HEIGHT}px`,
      width: `${rect.width}px`,
      height: `${HOVER_HEIGHT}px`,
      pointerEvents: 'auto',
      cursor: 'pointer',
    })
    el.addEventListener('mouseenter', () => this.tooltip.show(correction, el))
    el.addEventListener('mouseleave', () => this.tooltip.scheduleHide())
    el.addEventListener('click', () => this.tooltip.show(correction, el))
    return el
  }

  dispose(): void {
    window.removeEventListener('scroll', this.onReposition, { capture: true })
    window.removeEventListener('resize', this.onReposition)
    clearHighlightOwner(this)
    this.tooltip.dispose()
    this.container.remove()
  }
}
