import { OverlayRenderer } from '../src/overlay/renderer'
import { mockProofread } from '../src/proofread/mock'
import { applyCorrection } from '../src/apply/replace'
import type { ProofreadTarget } from '../src/input/detect'

// オーバーレイの位置精度を実ブラウザで確認するためのテストハーネス(Nano 不要)。
// esbuild で overlay-test.js にバンドルして overlay-test.html から読み込む。
function refresh(target: ProofreadTarget, renderer: OverlayRenderer): void {
  const text = target.value
  renderer.setData(text, text.trim().length > 0 ? mockProofread(text) : [])
}

function attach(target: ProofreadTarget): void {
  const renderer = new OverlayRenderer(target, {
    onApply: (correction) => {
      applyCorrection(target, correction)
      refresh(target, renderer)
    },
  })
  target.addEventListener('input', () => refresh(target, renderer))
  refresh(target, renderer)
}

document
  .querySelectorAll<ProofreadTarget>('textarea, input[type="text"]')
  .forEach((el) => attach(el))
