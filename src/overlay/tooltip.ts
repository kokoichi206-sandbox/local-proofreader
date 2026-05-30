import type { Correction } from '../state/types'
import type { OverlayCallbacks } from './types'

const TYPE_LABEL: Record<Correction['type'], string> = {
  typo: '誤字',
  grammar: '文法',
  punctuation: '句読点',
  unnatural: '不自然',
}

// 波線を hover/click したときに、訂正案 + 理由 + 適用/無視ボタンを出す。
// ページ CSS の影響を避けるため全てインラインスタイルで自己完結させる。
export class Tooltip {
  private readonly el: HTMLDivElement
  private hideTimer: ReturnType<typeof setTimeout> | undefined
  // 理由の遅延取得が別の指摘に切り替わったとき、古い結果を捨てるためのトークン。
  private reasonToken = 0

  constructor(private readonly callbacks: OverlayCallbacks) {
    this.el = document.createElement('div')
    Object.assign(this.el.style, {
      position: 'fixed',
      zIndex: '2147483647',
      maxWidth: '280px',
      padding: '8px 10px',
      borderRadius: '6px',
      background: '#1f2430',
      color: '#fff',
      font: '12px/1.5 system-ui, sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      pointerEvents: 'auto',
      display: 'none',
    })
    this.el.addEventListener('mouseenter', () => this.cancelHide())
    this.el.addEventListener('mouseleave', () => this.scheduleHide())
    document.body.appendChild(this.el)
  }

  show(correction: Correction, anchor: HTMLElement): void {
    this.cancelHide()
    this.render(correction)
    this.el.style.display = 'block'

    // 表示してサイズを測り、画面内に収まるよう配置する。
    const a = anchor.getBoundingClientRect()
    const tip = this.el.getBoundingClientRect()
    let left = a.left
    let top = a.bottom + 6
    if (left + tip.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - tip.width)
    }
    if (top + tip.height > window.innerHeight - 8) {
      top = a.top - tip.height - 6
    }
    this.el.style.left = `${left}px`
    this.el.style.top = `${Math.max(8, top)}px`
  }

  private render(correction: Correction): void {
    this.el.textContent = ''

    const head = document.createElement('div')
    head.style.marginBottom = '4px'
    const badge = document.createElement('span')
    badge.textContent = TYPE_LABEL[correction.type]
    Object.assign(badge.style, {
      fontSize: '10px',
      padding: '1px 6px',
      borderRadius: '8px',
      background: '#e5484d',
      marginRight: '6px',
    })
    const suggestion = document.createElement('strong')
    suggestion.textContent = correction.suggestion
    head.append(badge, suggestion)
    this.el.append(head)

    this.renderReason(correction)

    const actions = document.createElement('div')
    Object.assign(actions.style, { display: 'flex', gap: '6px' })
    const apply = this.button('適用', '#3b82f6')
    apply.addEventListener('click', () => {
      this.callbacks.onApply(correction)
      this.hide()
    })
    const dismiss = this.button('無視', 'transparent')
    dismiss.addEventListener('click', () => {
      this.callbacks.onDismiss?.(correction)
      this.hide()
    })
    actions.append(apply, dismiss)
    this.el.append(actions)
  }

  // 理由: 既にあればそのまま、無ければ onRequestReason で遅延取得する。
  private renderReason(correction: Correction): void {
    const token = ++this.reasonToken
    if (correction.reason) {
      this.el.append(this.reasonLine(correction.reason))
      return
    }
    if (!this.callbacks.onRequestReason) return

    const line = this.reasonLine('理由を取得中…')
    this.el.append(line)
    this.callbacks
      .onRequestReason(correction)
      .then((reason) => {
        if (token === this.reasonToken) line.textContent = reason
      })
      .catch(() => {
        if (token === this.reasonToken)
          line.textContent = '理由の取得に失敗しました'
      })
  }

  private reasonLine(text: string): HTMLDivElement {
    const el = document.createElement('div')
    el.textContent = text
    Object.assign(el.style, { opacity: '0.8', marginBottom: '6px' })
    return el
  }

  private button(label: string, background: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    Object.assign(b.style, {
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      background,
      color: '#fff',
      font: '11px system-ui, sans-serif',
      padding: '3px 10px',
    })
    return b
  }

  scheduleHide(): void {
    this.cancelHide()
    this.hideTimer = setTimeout(() => this.hide(), 200)
  }

  cancelHide(): void {
    if (this.hideTimer !== undefined) {
      clearTimeout(this.hideTimer)
      this.hideTimer = undefined
    }
  }

  hide(): void {
    this.el.style.display = 'none'
  }

  dispose(): void {
    this.cancelHide()
    this.el.remove()
  }
}
