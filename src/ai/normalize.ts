import type { Correction } from '../state/types'

// Nano が返すオフセットは日本語(マルチバイト/サロゲートペア)でズレることがある。
// original を元文字列に照合し、ズレていれば indexOf で位置を補正する。
// どうしても位置を特定できない指摘は破棄する: 誤った位置に下線を引くより、出さない方が安全。
export function repairOffsets(text: string, raw: Correction[]): Correction[] {
  const out: Correction[] = []
  for (const c of raw) {
    // 空の指摘、または修正案が元と同一(実質的な変更なし=ノイズ)は捨てる。
    if (c.original.length === 0 || c.suggestion === c.original) continue
    if (text.slice(c.start, c.end) === c.original) {
      out.push(c)
      continue
    }
    const i = text.indexOf(c.original)
    if (i >= 0) {
      out.push({ ...c, start: i, end: i + c.original.length })
      continue
    }
    // 位置を特定できない → 破棄(no silent wrong underline)
  }
  return out
}
