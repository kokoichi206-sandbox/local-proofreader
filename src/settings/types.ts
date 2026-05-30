import type { CorrectionType } from '../state/types'

export type TypeFilter = Record<CorrectionType, boolean>

export interface Settings {
  // type ごとの表示 ON/OFF。
  enabledTypes: TypeFilter
}

// 既定: 不自然(unnatural)は誤検出が出やすいため OFF。誤字/文法/句読点のみ常時表示。
// (コンセプト §10「誤検知 > 見逃し」。不自然系はユーザーが明示的にオンにする)
export const DEFAULT_SETTINGS: Settings = {
  enabledTypes: {
    typo: true,
    grammar: true,
    punctuation: true,
    unnatural: false,
  },
}
