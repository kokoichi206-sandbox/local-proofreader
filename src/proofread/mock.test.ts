import { describe, it, expect } from 'vitest'
import { mockProofread } from './mock'

describe('mockProofread', () => {
  it('既知の誤りが無い文では空を返す', () => {
    expect(mockProofread('これは正しい文です。')).toEqual([])
  })

  it('既知トークンを正しいオフセットで検出する', () => {
    const text = '資料を確認してくたさい。'
    const got = mockProofread(text)
    expect(got).toHaveLength(1)
    const i = text.indexOf('くたさい')
    expect(got[0]).toMatchObject({
      start: i,
      end: i + 4,
      original: 'くたさい',
      suggestion: 'ください',
      type: 'typo',
    })
  })

  it('複数トークンを出現位置順に返す', () => {
    const text = 'たべした あとで くたさい'
    const got = mockProofread(text)
    expect(got.map((g) => g.original)).toEqual(['たべした', 'くたさい'])
    expect(got[0].start).toBeLessThan(got[1].start)
  })
})
