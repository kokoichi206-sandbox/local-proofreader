import type { Correction } from '../state/types'

export interface OverlayCallbacks {
  // ツールチップの「適用」。該当範囲だけを置換する。
  onApply: (correction: Correction) => void
  // ツールチップの「無視」。任意。
  onDismiss?: (correction: Correction) => void
  // 理由の遅延取得。指摘に reason が無いとき、ツールチップ表示時に呼ばれる。任意。
  onRequestReason?: (correction: Correction) => Promise<string>
  // この入力欄で適用可能か。false なら「適用」ボタンを無効化し理由を明示する(既定 true)。
  canApply?: boolean
}
