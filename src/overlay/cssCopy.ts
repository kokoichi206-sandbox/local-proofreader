// textarea/input から測定用 mirror へ複製する computed style プロパティ(kebab-case)。
// width/height は scrollbar 補正のため mirror 側で個別に設定する(ここには含めない)。
export const COPIED_PROPERTIES = [
  'direction',
  'box-sizing',
  'overflow-x',
  'overflow-y',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-style',
  'font-variant',
  'font-weight',
  'font-stretch',
  'font-size',
  'font-size-adjust',
  'line-height',
  'font-family',
  'text-align',
  'text-transform',
  'text-indent',
  'text-decoration',
  'letter-spacing',
  'word-spacing',
  'tab-size',
  'word-break',
  'overflow-wrap',
  'white-space',
]

export function copyComputedStyles(
  source: Element,
  target: HTMLElement,
): CSSStyleDeclaration {
  const computed = getComputedStyle(source)
  for (const prop of COPIED_PROPERTIES) {
    target.style.setProperty(prop, computed.getPropertyValue(prop))
  }
  return computed
}
