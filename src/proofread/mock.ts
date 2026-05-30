import type { Correction, CorrectionType } from '../state/types'

// Nano を使わずにオーバーレイ(Phase 3)を end-to-end で動かすためのモック校正。
// 固定の誤りトークンを検出するだけ。Phase 4 で promptEngine.proofread に差し替える。
interface Token {
  bad: string
  good: string
  type: CorrectionType
  reason: string
}

const TOKENS: Token[] = [
  {
    bad: 'たべした',
    good: '食べました',
    type: 'typo',
    reason: '「食べました」の打ち間違いです',
  },
  { bad: 'くたさい', good: 'ください', type: 'typo', reason: '濁点の誤りです' },
  {
    bad: 'させていただくます',
    good: 'させていただきます',
    type: 'grammar',
    reason: '活用の誤りです',
  },
  { bad: 'いたしす', good: 'いたします', type: 'typo', reason: '脱字です' },
  {
    bad: '難しいでした',
    good: '難しかったです',
    type: 'grammar',
    reason: '形容詞の過去形の誤りです',
  },
]

export function mockProofread(text: string): Correction[] {
  const out: Correction[] = []
  for (const t of TOKENS) {
    let i = text.indexOf(t.bad)
    while (i >= 0) {
      out.push({
        start: i,
        end: i + t.bad.length,
        original: t.bad,
        suggestion: t.good,
        type: t.type,
        reason: t.reason,
      })
      i = text.indexOf(t.bad, i + t.bad.length)
    }
  }
  return out.sort((a, b) => a.start - b.start)
}
