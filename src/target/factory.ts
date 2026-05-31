import type { EditableTarget, TargetHandlers } from './types'
import { isProofreadTarget } from '../input/detect'
import { TextareaTarget } from './textarea'
import { ContentEditableTarget } from './contenteditable'

// 解決済みの校正対象要素(resolveProofreadElement の戻り値)から Target を作る。
// textarea/input → TextareaTarget(canApply=true)、contenteditable host → ContentEditableTarget(canApply=false)。
export function createTarget(
  element: HTMLElement,
  handlers: TargetHandlers,
): EditableTarget {
  if (isProofreadTarget(element)) {
    return new TextareaTarget(element, handlers)
  }
  return new ContentEditableTarget(element, handlers)
}
