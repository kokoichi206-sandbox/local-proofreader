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

// --- contenteditable(Slack/Gmail 等)の検出 ---

// CodeMirror/Monaco/Ace 等のコードエディタは contenteditable かつ role=textbox を持つため、
// isContentEditable だけでは弾けない。クラスシグネチャで除外する。
const CODE_EDITOR_SELECTOR =
  '.cm-editor, .cm-content, .CodeMirror, .monaco-editor, .ace_editor, [role="code"]'

// shadow DOM を貫通して真にフォーカスされている要素を返す。
export function deepActiveElement(): Element | null {
  let el: Element | null = document.activeElement
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement
  }
  return el
}

// 任意ノードから editing host(isContentEditable な最上位要素)を返す。なければ null。
export function editingHost(node: Node | null): HTMLElement | null {
  const start =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null)
  if (!start || !start.isContentEditable) return null
  let host = start
  for (
    let p = start.parentElement;
    p && p.isContentEditable;
    p = p.parentElement
  ) {
    host = p
  }
  return host
}

function isSensitiveEditable(el: HTMLElement): boolean {
  const hints =
    `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('role') ?? ''}`.toLowerCase()
  return SENSITIVE_PATTERN.test(hints)
}

export function isContentEditableHost(el: HTMLElement): boolean {
  if (!el.isContentEditable) return false
  if (el.closest(CODE_EDITOR_SELECTOR)) return false // コードエディタは対象外
  if (el.getAttribute('aria-readonly') === 'true') return false
  return !isSensitiveEditable(el)
}

// イベント対象/フォーカス要素から、校正対象の要素(textarea/input そのもの、または CE の editing host)
// を解決する。対象外なら null。managed の重複判定キーにも使う。
export function resolveProofreadElement(el: Element): HTMLElement | null {
  if (isProofreadTarget(el)) return el
  const host = editingHost(el)
  if (host && isContentEditableHost(host)) return host
  return null
}
