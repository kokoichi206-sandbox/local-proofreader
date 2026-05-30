import type { ProofreadTarget } from './detect'

export interface InputWatcherOptions {
  debounceMs?: number
  onStableText: (text: string, target: ProofreadTarget) => void
}

// IME 変換中(composition)は判定しない。compositionend + デバウンスで「文章が安定した」
// タイミングを捉える(コンセプト §9)。input 直書きは composing 中に発火するため除外する。
export class InputWatcher {
  private composing = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly debounceMs: number

  constructor(
    private readonly target: ProofreadTarget,
    private readonly opts: InputWatcherOptions,
  ) {
    this.debounceMs = opts.debounceMs ?? 1200
    this.target.addEventListener('compositionstart', this.onCompositionStart)
    this.target.addEventListener('compositionend', this.onCompositionEnd)
    this.target.addEventListener('input', this.onInput)
  }

  private onCompositionStart = (): void => {
    this.composing = true
  }

  private onCompositionEnd = (): void => {
    this.composing = false
    this.schedule()
  }

  private onInput = (): void => {
    if (!this.composing) this.schedule()
  }

  private schedule(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.opts.onStableText(this.target.value, this.target)
    }, this.debounceMs)
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.target.removeEventListener('compositionstart', this.onCompositionStart)
    this.target.removeEventListener('compositionend', this.onCompositionEnd)
    this.target.removeEventListener('input', this.onInput)
  }
}
