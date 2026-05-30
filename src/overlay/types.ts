import type { Correction } from '../state/types'

export interface OverlayCallbacks {
  // ツールチップの「適用」。該当範囲だけを置換する。
  onApply: (correction: Correction) => void
  // ツールチップの「無視」。任意。
  onDismiss?: (correction: Correction) => void
  // 理由の遅延取得。指摘に reason が無いとき、ツールチップ表示時に呼ばれる。任意。
  onRequestReason?: (correction: Correction) => Promise<string>
}
