import { describe, it, expect } from 'vitest'
import { isProofreadTarget } from './detect'

function input(attrs: Record<string, string> = {}): HTMLInputElement {
  const el = document.createElement('input')
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  return el
}

describe('isProofreadTarget', () => {
  it('textarea と input[type=text](type 未指定含む)を受け入れる', () => {
    expect(isProofreadTarget(document.createElement('textarea'))).toBe(true)
    expect(isProofreadTarget(input())).toBe(true)
    expect(isProofreadTarget(input({ type: 'text' }))).toBe(true)
  })

  it('text 以外の input 種別は除外する', () => {
    for (const type of [
      'password',
      'search',
      'email',
      'url',
      'number',
      'tel',
    ]) {
      expect(isProofreadTarget(input({ type }))).toBe(false)
    }
  })

  it('disabled / readonly は除外する', () => {
    expect(isProofreadTarget(input({ disabled: '' }))).toBe(false)
    expect(isProofreadTarget(input({ readonly: '' }))).toBe(false)
  })

  it('機密欄(autocomplete/name/id/aria-label のヒント)は除外する', () => {
    expect(isProofreadTarget(input({ autocomplete: 'one-time-code' }))).toBe(
      false,
    )
    expect(isProofreadTarget(input({ autocomplete: 'cc-number' }))).toBe(false)
    expect(isProofreadTarget(input({ name: 'otp' }))).toBe(false)
    expect(isProofreadTarget(input({ id: 'card-number' }))).toBe(false)
    expect(isProofreadTarget(input({ name: 'auth_secret' }))).toBe(false)
    expect(isProofreadTarget(input({ 'aria-label': 'OTP コード' }))).toBe(false)
  })

  it('input/textarea 以外は対象外', () => {
    expect(isProofreadTarget(document.createElement('div'))).toBe(false)
  })
})
