import type { Correction } from '../state/types'
import type {
  EditableTarget,
  TargetCapabilities,
  TargetHandlers,
} from './types'
import { textWithOffsets } from '../input/plainText'
import { ContentEditableWatcher } from '../input/contenteditableWatcher'
import { ContentEditableRenderer } from '../overlay/contenteditableRenderer'

// contenteditable(Slack/Gmail 等)向け Target。
// 描画は CSS Highlight(読み取り専用)。適用(置換)は別フェーズ(D)で execCommand 経路を実装するため、
// 現状は canApply=false 固定 = ツールチップの「適用」は無効表示にする(暗黙に無効化しない)。
export class ContentEditableTarget implements EditableTarget {
  readonly capabilities: TargetCapabilities = { canApply: false }
  private readonly renderer: ContentEditableRenderer
  private readonly watcher: ContentEditableWatcher

  constructor(
    readonly element: HTMLElement,
    handlers: TargetHandlers,
  ) {
    this.renderer = new ContentEditableRenderer(element, {
      onApply: handlers.onApply,
      onRequestReason: handlers.onRequestReason,
      canApply: false,
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

  apply(): boolean {
    return false // canApply=false。フェーズ D で execCommand('insertText') 経路を実装する。
  }

  dispose(): void {
    this.watcher.dispose()
    this.renderer.dispose()
  }
}
