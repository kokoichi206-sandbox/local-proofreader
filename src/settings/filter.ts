import type { Correction } from '../state/types'
import type { Settings } from './types'

// 有効な type の指摘だけを残す。Nano の推論結果は変えず、描画前に絞るだけ。
export function filterByEnabledTypes(
  corrections: Correction[],
  settings: Settings,
): Correction[] {
  return corrections.filter((c) => settings.enabledTypes[c.type])
}
