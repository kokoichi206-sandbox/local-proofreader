import { describe, it, expect } from 'vitest'
import { applyCorrectionToContentEditable } from './contenteditableReplace'

function ce(text: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('contenteditable', 'true')
  el.textContent = text
  document.body.append(el)
  return el
}

describe('applyCorrectionToContentEditable', () => {
  // 成功パス(execCommand による実置換)は jsdom が execCommand 非対応のため実機検証のみ。
  // ここでは「適用前ガード」= 現在値が original と一致しないときは置換せず false、を検証する。
  it('現在のテキストが original と一致しなければ置換せず false', () => {
    const root = ce('もう内容が変わっている')
    const ok = applyCorrectionToContentEditable(root, {
      start: 0,
      end: 4,
      original: 'くたさい',
      suggestion: 'ください',
      type: 'typo',
    })
    expect(ok).toBe(false)
    expect(root.textContent).toBe('もう内容が変わっている') // 無改変
    root.remove()
  })
})
