// v1 の校正対象は <textarea> と単純な <input type=text> のみ(コンセプト §7)。
// password/search/email/url/number などの特殊 input、contenteditable、Google Docs は除外。
export type ProofreadTarget = HTMLTextAreaElement | HTMLInputElement

export function isProofreadTarget(el: Element): el is ProofreadTarget {
  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly
  }
  if (el instanceof HTMLInputElement) {
    // 属性未指定/不正値は el.type が 'text' に正規化される。
    // search/email/url/number/password 等はここで弾かれる。
    if (el.type !== 'text') return false
    return !el.disabled && !el.readOnly
  }
  return false
}
