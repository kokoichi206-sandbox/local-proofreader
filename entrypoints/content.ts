import { defineContentScript } from '#imports'
import { resolveProofreadElement } from '../src/input/detect'
import { createTarget } from '../src/target/factory'
import type { EditableTarget } from '../src/target/types'
import { promptEngine } from '../src/ai/promptClient'
import { detectState } from '../src/ai/availability'
import type { Correction } from '../src/state/types'
import { DEFAULT_SETTINGS, type Settings } from '../src/settings/types'
import { loadSettings, onSettingsChanged } from '../src/settings/store'
import { filterByEnabledTypes } from '../src/settings/filter'

interface Managed {
  target: EditableTarget
  lastText: string | null // 最後に校正したテキスト(同一なら再校正をスキップ)
  lastCorrections: Correction[] // 生の指摘。設定変更時は再校正せず type で絞り直す
  inFlight: boolean // 校正の二重起動を防ぐ
  pending: boolean // 校正中に新しい入力が来た
  seq: number // 古い非同期結果で新しい表示を上書きしないための連番
}

// textarea/input と contenteditable(Slack/Gmail 等)を、同じ監視→AI→描画パイプラインで扱う。
// 入力種別の差は EditableTarget(target/factory)が吸収する。
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    let engineReady = false
    let initPromise: Promise<boolean> | null = null
    let settings: Settings = DEFAULT_SETTINGS
    const managed = new Map<Element, Managed>()

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

    // 生の指摘を有効 type で絞って描画する(設定変更時の再描画にも使う)。
    const draw = (m: Managed): void => {
      if (m.lastText === null) return
      m.target.setCorrections(
        m.lastText,
        filterByEnabledTypes(m.lastCorrections, settings),
      )
    }

    const proofread = async (m: Managed): Promise<void> => {
      const text = m.target.getText()
      if (text.trim().length === 0) {
        m.lastText = text
        m.lastCorrections = []
        m.target.setCorrections(text, [])
        return
      }
      if (text === m.lastText) return // 同一テキストは再校正しない
      if (!(await ensureEngine())) return
      if (m.inFlight) {
        m.pending = true
        return
      }
      m.inFlight = true
      const seq = ++m.seq
      try {
        const corrections = await promptEngine.proofread(text)
        if (seq === m.seq && m.target.getText() === text) {
          m.lastText = text
          m.lastCorrections = corrections
          draw(m)
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

    void loadSettings().then((s) => {
      settings = s
      for (const m of managed.values()) draw(m)
    })
    onSettingsChanged((s) => {
      settings = s
      for (const m of managed.values()) draw(m)
    })

    document.addEventListener('focusin', (e) => {
      if (!(e.target instanceof Element)) return
      const key = resolveProofreadElement(e.target)
      if (!key || managed.has(key)) return

      const target = createTarget(key, {
        onStableText: () => {
          const m = managed.get(key)
          if (m) void proofread(m)
        },
        // 自動訂正はしない。ユーザーがツールチップで「適用」したときだけ置換する。
        onApply: (correction) => {
          const m = managed.get(key)
          if (!m) return
          m.target.apply(correction)
          void proofread(m)
        },
        onRequestReason: (correction) =>
          promptEngine.explain(
            managed.get(key)?.target.getText() ?? '',
            correction,
          ),
      })
      const m: Managed = {
        target,
        lastText: null,
        lastCorrections: [],
        inFlight: false,
        pending: false,
        seq: 0,
      }
      managed.set(key, m)
      void proofread(m)
    })

    // 要素が DOM から外れたら(SPA の画面遷移など)関連リソースを破棄する。
    const cleanup = new MutationObserver(() => {
      for (const [el, m] of managed) {
        if (!el.isConnected) {
          m.target.dispose()
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
