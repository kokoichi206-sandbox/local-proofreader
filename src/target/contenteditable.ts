import type { Correction } from '../state/types'
import type {
  EditableTarget,
  TargetCapabilities,
  TargetHandlers,
} from './types'
import { textWithOffsets } from '../input/plainText'
import { ContentEditableWatcher } from '../input/contenteditableWatcher'
import { ContentEditableRenderer } from '../overlay/contenteditableRenderer'
import {
  isInsertTextSupported,
  applyCorrectionToContentEditable,
} from '../apply/contenteditableReplace'

// contenteditable(Slack/Gmail 等)向け Target。
// 描画は CSS Highlight(DOM 非改変)。適用は execCommand('insertText') 経由で、
// 対応可否(canApply)は queryCommandSupported で判定する。非対応の欄は「適用」を無効表示にする。
export class ContentEditableTarget implements EditableTarget {
  readonly capabilities: TargetCapabilities
  private readonly renderer: ContentEditableRenderer
  private readonly watcher: ContentEditableWatcher

  constructor(
    readonly element: HTMLElement,
    handlers: TargetHandlers,
  ) {
    this.capabilities = { canApply: isInsertTextSupported() }
    this.renderer = new ContentEditableRenderer(element, {
      onApply: handlers.onApply,
      onRequestReason: handlers.onRequestReason,
      canApply: this.capabilities.canApply,
    })
    this.watcher = new ContentEditableWatcher(element, {
      onStableText: () => handlers.onStableText(),
    })
  }

  getText(): string {
    return textWithOffsets(this.element).text
  }

  setCorrections(text: string, corrections: Correction[]): void {
    this.renderer.setData(text, corrections)
  }

  apply(correction: Correction): boolean {
    if (!this.capabilities.canApply) return false
    return applyCorrectionToContentEditable(this.element, correction)
  }

  dispose(): void {
    this.watcher.dispose()
    this.renderer.dispose()
  }
}
