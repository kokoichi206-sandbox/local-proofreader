import { defineContentScript } from '#imports'
import { isProofreadTarget } from '../src/input/detect'
import type { ProofreadTarget } from '../src/input/detect'
import { InputWatcher } from '../src/input/watcher'
import { OverlayRenderer } from '../src/overlay/renderer'
import { applyCorrection } from '../src/apply/replace'
import { promptEngine } from '../src/ai/promptClient'
import { detectState } from '../src/ai/availability'

// Phase 4: 入力監視 → Nano 校正 → オーバーレイ波線 → ツールチップ(理由は遅延取得) → 範囲置換。
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    let engineReady = false
    let initPromise: Promise<boolean> | null = null

    // モデルの準備を一度だけ行う。ダウンロードは popup(ユーザー操作)側で行う前提で、
    // ここでは availability を確認し READY のときだけ create する。
    const ensureEngine = (): Promise<boolean> => {
      if (engineReady) return Promise.resolve(true)
      if (!initPromise) {
        initPromise = (async () => {
          const state = await detectState()
          if (state.kind !== 'READY') {
            // 暗黙に無効化せず、状態を明示する(popup で DL/確認できる)。
            console.warn(
              `[local-proofreader] Nano 未準備 (${state.kind})。popup でモデルの状態を確認してください。`,
            )
            return false
          }
          await promptEngine.ensureReady()
          engineReady = true
          return true
        })()
      }
      return initPromise
    }

    const managed = new WeakMap<
      Element,
      { watcher: InputWatcher; renderer: OverlayRenderer }
    >()

    const refresh = async (
      target: ProofreadTarget,
      renderer: OverlayRenderer,
    ): Promise<void> => {
      const text = target.value
      if (text.trim().length === 0) {
        renderer.setData(text, [])
        return
      }
      if (!(await ensureEngine())) return
      try {
        const corrections = await promptEngine.proofread(text)
        // stale ガード: 校正中に入力が変わっていたら結果を捨てる(古いオフセットで下線を引かない)。
        if (target.value !== text) return
        renderer.setData(text, corrections)
      } catch (e) {
        console.warn('[local-proofreader] 校正に失敗:', e)
      }
    }

    document.addEventListener('focusin', (e) => {
      const el = e.target
      if (!(el instanceof Element) || !isProofreadTarget(el)) return
      if (managed.has(el)) return

      const target = el
      const renderer = new OverlayRenderer(target, {
        // 自動訂正はしない。ユーザーがツールチップで「適用」したときだけ置換する。
        onApply: (correction) => {
          applyCorrection(target, correction)
          void refresh(target, renderer)
        },
        // 理由はツールチップを開いたときに生成する。
        onRequestReason: (correction) =>
          promptEngine.explain(target.value, correction),
      })
      const watcher = new InputWatcher(target, {
        onStableText: () => void refresh(target, renderer),
      })
      managed.set(el, { watcher, renderer })

      // focus だけでは watcher は発火しないので、既存テキストを初回校正する。
      void refresh(target, renderer)
    })
  },
})
