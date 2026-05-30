// v1 の校正対象は <textarea> と単純な <input type=text> のみ(コンセプト §7)。
// password/search/email/url/number などの特殊 input、contenteditable、Google Docs は除外。
export type ProofreadTarget = HTMLTextAreaElement | HTMLInputElement

// 機密入力欄(ワンタイムコード・カード・パスワード等)はローカル処理でもモデルに渡さない。
// name/id/autocomplete/aria-label のヒントで判定する(ユーザー入力境界での防御)。
const SENSITIVE_PATTERN =
  /(otp|one-?time|verification|cc-|card|cvc|cvv|credit|passw|secret|token|auth|pin|account|routing|iban|ssn|social)/i

function isSensitive(el: ProofreadTarget): boolean {
  const autocomplete = el.autocomplete.toLowerCase()
  if (autocomplete === 'one-time-code' || autocomplete.startsWith('cc-')) {
    return true
  }
  const hints =
    `${el.name} ${el.id} ${autocomplete} ${el.getAttribute('aria-label') ?? ''}`.toLowerCase()
  return SENSITIVE_PATTERN.test(hints)
}

export function isProofreadTarget(el: Element): el is ProofreadTarget {
  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly && !isSensitive(el)
  }
  if (el instanceof HTMLInputElement) {
    // 属性未指定/不正値は el.type が 'text' に正規化される。
    // search/email/url/number/password 等はここで弾かれる。
    if (el.type !== 'text') return false
    return !el.disabled && !el.readOnly && !isSensitive(el)
  }
  return false
}
