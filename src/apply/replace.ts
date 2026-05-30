import type { ProofreadTarget } from '../input/detect'

// controlled input(React/Vue 等)では .value 直書きだと onChange が発火せず内部 state とズレる。
// prototype の native setter を呼ぶとフレームワークの value tracker が変更を検知し、
// その後の input イベントで正しく state が更新される。
function setNativeValue(target: ProofreadTarget, value: string): void {
  const proto =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (!descriptor?.set) {
    throw new Error('value の native setter を取得できません')
  }
  descriptor.set.call(target, value)
}

// 指摘範囲 [start,end) だけを suggestion に置換する。自動訂正はせず、ユーザー操作起点でのみ呼ぶ。
// ツールチップ表示後に入力が変わっていると古いオフセットでの誤置換になるため、
// 置換前に現在値が original と一致することを確認する。不一致なら適用せず false を返す。
export function applyCorrection(
  target: ProofreadTarget,
  correction: {
    start: number
    end: number
    original: string
    suggestion: string
  },
): boolean {
  const current = target.value
  if (current.slice(correction.start, correction.end) !== correction.original) {
    return false
  }

  const next =
    current.slice(0, correction.start) +
    correction.suggestion +
    current.slice(correction.end)

  setNativeValue(target, next)

  const caret = correction.start + correction.suggestion.length
  target.setSelectionRange(caret, caret)

  // フレームワークと監視層に変更を伝える。
  target.dispatchEvent(new Event('input', { bubbles: true }))
  target.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}
