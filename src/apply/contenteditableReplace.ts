import type { Correction } from '../state/types'
import { textWithOffsets, offsetToRange } from '../input/plainText'

// contenteditable で execCommand('insertText') が使えるか(エディタ毎の capability 判定)。
export function isInsertTextSupported(): boolean {
  try {
    return document.queryCommandSupported('insertText')
  } catch {
    return false
  }
}

// contenteditable の該当範囲だけを suggestion に置換する。
// Selection + execCommand('insertText') を使うと、ブラウザが trusted な beforeinput/input を発火し、
// ProseMirror/Quill/Lexical 等のエディタが「実ユーザー入力」として受理する(undo にも乗る)。
// 直接 DOM 改変(textContent/insertNode)は内部モデルと乖離し巻き戻るため使わない。
export function applyCorrectionToContentEditable(
  root: HTMLElement,
  correction: Correction,
): boolean {
  const before = textWithOffsets(root)
  // 適用前ガード: 表示後に編集され original と一致しなければ置換しない(誤位置への置換防止)。
  if (
    before.text.slice(correction.start, correction.end) !== correction.original
  ) {
    return false
  }
  const range = offsetToRange(before, correction.start, correction.end)
  if (!range) return false

  const selection = window.getSelection()
  if (!selection) return false

  root.focus() // ツールチップのボタンへ移ったフォーカスを入力欄へ戻す
  selection.removeAllRanges()
  selection.addRange(range)
  document.execCommand('insertText', false, correction.suggestion)

  // 適用後検証: 期待文字列と一致するか。execCommand の戻り値は信用しない。
  // 不一致(エディタが想定外の変換をした等)は成功と主張せず surface する。直後の再校正が実状態を評価し直す。
  const expected =
    before.text.slice(0, correction.start) +
    correction.suggestion +
    before.text.slice(correction.end)
  const after = textWithOffsets(root).text
  if (after !== expected) {
    console.warn(
      '[local-proofreader] 適用後の検証に失敗(エディタが想定外の変換をした可能性):',
      { expected, after },
    )
    return false
  }
  return true
}
