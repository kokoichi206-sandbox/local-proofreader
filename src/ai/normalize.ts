import type { Correction, CorrectionType } from '../state/types'

const VALID_TYPES: ReadonlySet<string> = new Set<CorrectionType>([
  'typo',
  'grammar',
  'punctuation',
  'unnatural',
])

// AI 出力は未信頼データ。構造(型・enum)を実行時に検証する。prompt injection や
// モデルの逸脱で壊れた item を弾くための AI 境界バリデーション。
function isStructurallyValid(item: unknown): item is Correction {
  if (typeof item !== 'object' || item === null) return false
  const v = item as Record<string, unknown>
  return (
    Number.isInteger(v.start) &&
    Number.isInteger(v.end) &&
    typeof v.original === 'string' &&
    typeof v.suggestion === 'string' &&
    typeof v.type === 'string' &&
    VALID_TYPES.has(v.type)
  )
}

// オフセットを元文字列に対して検証・補正し、信頼できる指摘だけを返す。
// - 構造が不正な item は捨てる
// - 修正案が元と同一(実質変更なし)は捨てる
// - start/end が範囲内かつ original と一致すれば採用
// - 一致しないが original が「一意に」出現するなら位置を補正(複数出現時は誤補正を避け破棄)
// - それ以外は破棄(誤った位置に下線を引くより出さない)
export function repairOffsets(text: string, raw: unknown[]): Correction[] {
  const out: Correction[] = []
  for (const item of raw) {
    if (!isStructurallyValid(item)) continue
    const c = item
    if (c.original.length === 0 || c.suggestion === c.original) continue

    const inRange = c.start >= 0 && c.start < c.end && c.end <= text.length
    if (inRange && text.slice(c.start, c.end) === c.original) {
      out.push(c)
      continue
    }
    const first = text.indexOf(c.original)
    const unique = first >= 0 && text.indexOf(c.original, first + 1) === -1
    if (unique) {
      out.push({ ...c, start: first, end: first + c.original.length })
      continue
    }
    // 範囲外/不一致/複数出現で特定不能 → 破棄
  }
  return out
}
