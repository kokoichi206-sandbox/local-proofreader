import { describe, it, expect } from 'vitest'
import { textWithOffsets, offsetToRange } from './plainText'

function ce(html: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('contenteditable', 'true')
  el.innerHTML = html
  return el
}

describe('textWithOffsets', () => {
  it('インラインのネストを 1 本のテキストに連結する', () => {
    expect(textWithOffsets(ce('foo <b>bar</b> baz')).text).toBe('foo bar baz')
  })

  it('<br> を 1 個の改行にする', () => {
    expect(textWithOffsets(ce('a<br>b')).text).toBe('a\nb')
  })

  it('連続するブロックの間に改行を 1 個入れ、先頭・末尾には付けない', () => {
    expect(textWithOffsets(ce('<div>x</div><div>y</div>')).text).toBe('x\ny')
  })

  it('display:none は抽出しない', () => {
    expect(
      textWithOffsets(ce('見える<span style="display:none">隠れ</span>text'))
        .text,
    ).toBe('見えるtext')
  })
})

describe('offsetToRange', () => {
  it('オフセット範囲に対応する Range のテキストが一致する', () => {
    const root = ce('foo bar baz')
    const tw = textWithOffsets(root)
    const start = tw.text.indexOf('bar')
    const range = offsetToRange(tw, start, start + 3)
    expect(range?.toString()).toBe('bar')
  })

  it('改行をまたぐ範囲も取得できる', () => {
    const root = ce('a<br>bcd')
    const tw = textWithOffsets(root) // 'a\nbcd'
    const start = tw.text.indexOf('bcd')
    const range = offsetToRange(tw, start, start + 3)
    expect(range?.toString()).toBe('bcd')
  })

  it('ネストしたインライン内の範囲を取得できる', () => {
    const root = ce('わたしは<b>くたさい</b>と打った')
    const tw = textWithOffsets(root)
    const start = tw.text.indexOf('くたさい')
    const range = offsetToRange(tw, start, start + 4)
    expect(range?.toString()).toBe('くたさい')
  })
})
