import type { Correction } from '../state/types'

// 校正エンジンの共通インターフェース。
// 当面は Prompt API 実装(promptClient)。Proofreader API が日本語 stable になったら
// 同インターフェースの別実装へ無改修で差し替えられるようにする。
export interface ProofreadEngine {
  readonly name: string
  // モデルの準備(必要ならダウンロード)。onProgress は 0..1。
  // ダウンロードはユーザー操作起点で呼ぶこと(create がDLを伴うため)。
  ensureReady(onProgress?: (loaded: number) => void): Promise<void>
  proofread(text: string): Promise<Correction[]>
  // ツールチップ表示時に、ある指摘の理由を遅延生成する(常時パスに自由文を混ぜない)。
  explain(text: string, correction: Correction): Promise<string>
  destroy(): void
}
