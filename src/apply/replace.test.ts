import { describe, it, expect } from 'vitest'
import { applyCorrection } from './replace'

describe('applyCorrection', () => {
  it('現在値が original と一致すれば該当範囲だけ置換する', () => {
    const ta = document.createElement('textarea')
    ta.value = '資料を確認してくたさい。'
    const i = ta.value.indexOf('くたさい')
    const ok = applyCorrection(ta, {
      start: i,
      end: i + 4,
      original: 'くたさい',
      suggestion: 'ください',
    })
    expect(ok).toBe(true)
    expect(ta.value).toBe('資料を確認してください。')
  })

  it('表示後に入力が変わって original と一致しないなら置換しない', () => {
    const ta = document.createElement('textarea')
    ta.value = 'もう変わった文'
    const ok = applyCorrection(ta, {
      start: 0,
      end: 4,
      original: 'くたさい',
      suggestion: 'ください',
    })
    expect(ok).toBe(false)
    expect(ta.value).toBe('もう変わった文')
  })

  it('成功時に input イベントを発火する(controlled input 連携のため)', () => {
    const ta = document.createElement('textarea')
    ta.value = 'くたさい'
    let fired = false
    ta.addEventListener('input', () => {
      fired = true
    })
    applyCorrection(ta, {
      start: 0,
      end: 4,
      original: 'くたさい',
      suggestion: 'ください',
    })
    expect(fired).toBe(true)
  })
})
