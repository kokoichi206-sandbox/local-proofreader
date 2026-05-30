import { describe, it, expect } from 'vitest'
import type { Correction } from '../state/types'
import { repairOffsets } from './normalize'

// 部分指定から Correction を組む補助(テストの可読性のため)。
function correction(over: Partial<Correction>): Correction {
  return {
    start: 0,
    end: 0,
    original: '',
    suggestion: '',
    type: 'typo',
    ...over,
  }
}

describe('repairOffsets', () => {
  it('オフセットが一致する指摘はそのまま採用する', () => {
    const text = '資料を確認してくたさい。'
    const start = text.indexOf('くたさい')
    const got = repairOffsets(text, [
      correction({
        start,
        end: start + 4,
        original: 'くたさい',
        suggestion: 'ください',
      }),
    ])
    expect(got).toEqual([
      {
        start,
        end: start + 4,
        original: 'くたさい',
        suggestion: 'ください',
        type: 'typo',
      },
    ])
  })

  it('修正案が元と同一(変更なし)の指摘は捨てる', () => {
    const text = 'これは正しい'
    const got = repairOffsets(text, [
      correction({ start: 0, end: 2, original: 'これ', suggestion: 'これ' }),
    ])
    expect(got).toEqual([])
  })

  it('オフセットが誤っていても original が一意に出現すれば位置を補正する', () => {
    const text = 'まず くたさい を直す'
    const i = text.indexOf('くたさい')
    const got = repairOffsets(text, [
      correction({
        start: 0,
        end: 4,
        original: 'くたさい',
        suggestion: 'ください',
      }),
    ])
    expect(got).toEqual([
      {
        start: i,
        end: i + 4,
        original: 'くたさい',
        suggestion: 'ください',
        type: 'typo',
      },
    ])
  })

  it('original が複数回出現し位置が曖昧なら破棄する', () => {
    const text = 'くたさい またね くたさい'
    const got = repairOffsets(text, [
      correction({
        start: 99,
        end: 103,
        original: 'くたさい',
        suggestion: 'ください',
      }),
    ])
    expect(got).toEqual([])
  })

  it('構造が不正な item(型違い・非整数・欠落・非オブジェクト)は捨てる', () => {
    const text = 'テスト文字列'
    const got = repairOffsets(text, [
      { start: 0, end: 2, original: 'テス', suggestion: 'です', type: 'bogus' },
      {
        start: 0.5,
        end: 2,
        original: 'テス',
        suggestion: 'です',
        type: 'typo',
      },
      { start: 0, end: 2, suggestion: 'です', type: 'typo' },
      'not an object',
      null,
    ])
    expect(got).toEqual([])
  })

  it('範囲外で元文字列にも一致しない指摘は破棄する', () => {
    const text = '短い'
    const got = repairOffsets(text, [
      correction({
        start: 0,
        end: 999,
        original: 'もっと長い',
        suggestion: 'x',
      }),
    ])
    expect(got).toEqual([])
  })
})
