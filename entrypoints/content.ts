import { defineContentScript } from '#imports'
import { isProofreadTarget } from '../src/input/detect'
import type { ProofreadTarget } from '../src/input/detect'
import { InputWatcher } from '../src/input/watcher'
import { OverlayRenderer } from '../src/overlay/renderer'
import { applyCorrection } from '../src/apply/replace'
import { promptEngine } from '../src/ai/promptClient'
import { detectState } from '../src/ai/availability'

interface Managed {
  target: ProofreadTarget
  watcher: InputWatcher
  renderer: OverlayRenderer
  lastText: string | null // 最後に校正したテキスト(同一なら再校正をスキップ)
  inFlight: boolean // 校正の二重起動を防ぐ
  pending: boolean // 校正中に新しい入力が来た
  seq: number // 古い非同期結果で新しい表示を上書きしないための連番
}

// Phase 4: 入力監視 → Nano 校正 → オーバーレイ波線 → ツールチップ(理由は遅延取得) → 範囲置換。
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    let engineReady = false
    let initPromise: Promise<boolean> | null = null

    // モデルの準備を確認する。ダウンロードは popup(ユーザー操作)側で行う前提で、
    // ここでは availability を確認し READY のときだけ create する。
    // 非 READY のときは initPromise を残さない → popup で DL 後、再フォーカスで再判定される。
    const ensureEngine = (): Promise<boolean> => {
      if (engineReady) return Promise.resolve(true)
      if (!initPromise) {
        initPromise = (async () => {
          const state = await detectState()
          if (state.kind !== 'READY') {
            console.warn(
              `[local-proofreader] Nano 未準備 (${state.kind})。popup でモデルの状態を確認してください。`,
            )
            return false
          }
          await promptEngine.ensureReady()
          engineReady = true
          return true
        })().finally(() => {
          if (!engineReady) initPromise = null
        })
      }
      return initPromise
    }

    const managed = new Map<Element, Managed>()

    const proofread = async (m: Managed): Promise<void> => {
      const text = m.target.value
      if (text.trim().length === 0) {
        m.lastText = text
        m.renderer.setData(text, [])
        return
      }
      if (text === m.lastText) return // 同一テキストは再校正しない
      if (!(await ensureEngine())) return
      if (m.inFlight) {
        m.pending = true // 校正中なら完了後に最新で再実行
        return
      }
      m.inFlight = true
      const seq = ++m.seq
      try {
        const corrections = await promptEngine.proofread(text)
        // 古い結果や入力変化後の結果で上書きしない。
        if (seq === m.seq && m.target.value === text) {
          m.lastText = text
          m.renderer.setData(text, corrections)
        }
      } catch (e) {
        console.warn('[local-proofreader] 校正に失敗:', e)
      } finally {
        m.inFlight = false
        if (m.pending) {
          m.pending = false
          void proofread(m)
        }
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
          // 置換成否に関わらず再校正して表示を最新化する(置換できない=入力変化時も含む)。
          const m = managed.get(target)
          if (m) void proofread(m)
        },
        onRequestReason: (correction) =>
          promptEngine.explain(target.value, correction),
      })
      const m: Managed = {
        target,
        renderer,
        watcher: new InputWatcher(target, {
          onStableText: () => {
            const entry = managed.get(target)
            if (entry) void proofread(entry)
          },
        }),
        lastText: null,
        inFlight: false,
        pending: false,
        seq: 0,
      }
      managed.set(el, m)

      // focus だけでは watcher は発火しないので、既存テキストを初回校正する。
      void proofread(m)
    })

    // 要素が DOM から外れたら(SPA の画面遷移など)関連リソースを破棄する。
    // WeakMap では解放タイミングを制御できないため Map + 切断検知で明示的に dispose する。
    const cleanup = new MutationObserver(() => {
      for (const [el, m] of managed) {
        if (!el.isConnected) {
          m.watcher.dispose()
          m.renderer.dispose()
          managed.delete(el)
        }
      }
    })
    cleanup.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  },
})
