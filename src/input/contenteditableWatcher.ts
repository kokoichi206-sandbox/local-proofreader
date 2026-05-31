export interface ContentEditableWatcherOptions {
  debounceMs?: number
  onStableText: () => void
}

// contenteditable 用の監視。textarea の InputWatcher と違い .value が無いので別クラス。
// input + composition に加え、フレームワーク経由の DOM 書き換え(input を経由しない再描画)も
// MutationObserver で拾う。IME 変換中は評価しない。
export class ContentEditableWatcher {
  private composing = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly debounceMs: number
  private readonly observer: MutationObserver

  constructor(
    private readonly root: HTMLElement,
    private readonly opts: ContentEditableWatcherOptions,
  ) {
    this.debounceMs = opts.debounceMs ?? 1200
    this.root.addEventListener('compositionstart', this.onCompositionStart)
    this.root.addEventListener('compositionend', this.onCompositionEnd)
    this.root.addEventListener('input', this.onInput)
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(this.root, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  }

  private readonly onCompositionStart = (): void => {
    this.composing = true
  }

  private readonly onCompositionEnd = (): void => {
    this.composing = false
    this.schedule()
  }

  private readonly onInput = (e: Event): void => {
    // Chrome は compositionend 前に最後の composing input(isComposing=true)を出す。両方で弾く。
    if (this.composing || (e as InputEvent).isComposing) return
    this.schedule()
  }

  private schedule(): void {
    if (this.composing) return
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.opts.onStableText(), this.debounceMs)
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.observer.disconnect()
    this.root.removeEventListener('compositionstart', this.onCompositionStart)
    this.root.removeEventListener('compositionend', this.onCompositionEnd)
    this.root.removeEventListener('input', this.onInput)
  }
}
