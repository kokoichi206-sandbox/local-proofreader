import type { Correction } from '../state/types'

export interface TargetHandlers {
  // 入力が安定したとき(IME 確定 + デバウンス)に呼ばれる。content 側で再校正する。
  onStableText: () => void
  // ツールチップの「適用」。
  onApply: (correction: Correction) => void
  // ツールチップ表示時の理由の遅延取得。
  onRequestReason?: (correction: Correction) => Promise<string>
}

export interface TargetCapabilities {
  // この入力欄でツールチップの「適用」が使えるか(contenteditable は当面 false)。
  readonly canApply: boolean
}

// textarea/input と contenteditable を同じ校正パイプライン(監視→AI→描画→適用)に
// 載せるための抽象。描画方式(mirror overlay / CSS Highlight)の違いは実装側が吸収する。
export interface EditableTarget {
  readonly element: HTMLElement
  // 校正対象のプレーンテキスト(AI に渡す文字列であり、オフセットの基準でもある)。
  getText(): string
  // 指摘を描画する(波線 + ヒット領域)。空配列でクリア。
  setCorrections(text: string, corrections: Correction[]): void
  // 該当範囲だけを置換。成功で true。canApply=false のときは常に false。
  apply(correction: Correction): boolean
  readonly capabilities: TargetCapabilities
  dispose(): void
}
