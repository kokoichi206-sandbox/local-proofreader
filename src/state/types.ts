export type CorrectionType = 'typo' | 'grammar' | 'punctuation' | 'unnatural'

// 校正の指摘。start/end は value(プレーン文字列)への UTF-16 code unit オフセット。
export interface Correction {
  start: number
  end: number
  original: string
  suggestion: string
  type: CorrectionType
  reason?: string
}

// 「暗黙の fallback 禁止」(コンセプト §10): Nano が使えない状況を黙って無効化せず、
// 明示的な状態として列挙し UI に案内する。
export type EngineState =
  | { kind: 'API_ABSENT' } // LanguageModel が global に存在しない
  | { kind: 'LANG_UNAVAILABLE' } // availability() が 'unavailable'(日本語/端末非対応)
  | { kind: 'DOWNLOADABLE' } // モデル未取得。ユーザー操作でDL可能
  | { kind: 'DOWNLOADING'; progress: number } // DL中(progress は 0..1)
  | { kind: 'READY' } // 校正可能
  | { kind: 'ERROR'; message: string } // 例外。握りつぶさず内容を表示
