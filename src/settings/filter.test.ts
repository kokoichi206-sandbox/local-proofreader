import { describe, it, expect } from 'vitest'
import type { Correction } from '../state/types'
import { DEFAULT_SETTINGS } from './types'
import { filterByEnabledTypes } from './filter'

function c(type: Correction['type']): Correction {
  return { start: 0, end: 1, original: 'x', suggestion: 'y', type }
}

describe('filterByEnabledTypes', () => {
  it('既定では unnatural を除外し、誤字/文法/句読点は残す', () => {
    const got = filterByEnabledTypes(
      [c('typo'), c('grammar'), c('punctuation'), c('unnatural')],
      DEFAULT_SETTINGS,
    )
    expect(got.map((x) => x.type)).toEqual(['typo', 'grammar', 'punctuation'])
  })

  it('unnatural を有効にすると残る', () => {
    const settings = {
      enabledTypes: { ...DEFAULT_SETTINGS.enabledTypes, unnatural: true },
    }
    const got = filterByEnabledTypes([c('unnatural')], settings)
    expect(got).toHaveLength(1)
  })

  it('全 type を無効にすると空になる', () => {
    const settings = {
      enabledTypes: {
        typo: false,
        grammar: false,
        punctuation: false,
        unnatural: false,
      },
    }
    expect(filterByEnabledTypes([c('typo'), c('grammar')], settings)).toEqual(
      [],
    )
  })
})
