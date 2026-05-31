import type { Correction } from '../state/types'
import type {
  EditableTarget,
  TargetCapabilities,
  TargetHandlers,
} from './types'
import type { ProofreadTarget } from '../input/detect'
import { OverlayRenderer } from '../overlay/renderer'
import { InputWatcher } from '../input/watcher'
import { applyCorrection } from '../apply/replace'

// 既存の textarea/input 実装(mirror overlay + InputWatcher + applyCorrection)を
// EditableTarget でラップするアダプタ。描画・監視・置換の挙動は従来どおり(無改修)。
export class TextareaTarget implements EditableTarget {
  readonly capabilities: TargetCapabilities = { canApply: true }
  private readonly renderer: OverlayRenderer
  private readonly watcher: InputWatcher

  constructor(
    readonly element: ProofreadTarget,
    handlers: TargetHandlers,
  ) {
    this.renderer = new OverlayRenderer(element, {
      onApply: handlers.onApply,
      onRequestReason: handlers.onRequestReason,
      canApply: true,
    })
    this.watcher = new InputWatcher(element, {
      onStableText: () => handlers.onStableText(),
    })
  }

  getText(): string {
    return this.element.value
  }

  setCorrections(text: string, corrections: Correction[]): void {
    this.renderer.setData(text, corrections)
  }

  apply(correction: Correction): boolean {
    return applyCorrection(this.element, correction)
  }

  dispose(): void {
    this.watcher.dispose()
    this.renderer.dispose()
  }
}
