import { detectState } from '../../src/ai/availability'
import { promptEngine } from '../../src/ai/promptClient'
import type { EngineState } from '../../src/state/types'
import type { CorrectionType } from '../../src/state/types'
import { loadSettings, saveSettings } from '../../src/settings/store'
import type { Settings } from '../../src/settings/types'

const statusEl = document.querySelector<HTMLParagraphElement>('#status')
const detailEl = document.querySelector<HTMLParagraphElement>('#detail')
const downloadBtn = document.querySelector<HTMLButtonElement>('#download')

if (!statusEl || !detailEl || !downloadBtn) {
  throw new Error('popup の要素が見つかりません')
}

// 「暗黙の fallback 禁止」: 各状態を明示的な文言で案内する。
function render(state: EngineState): void {
  downloadBtn!.hidden = state.kind !== 'DOWNLOADABLE'
  switch (state.kind) {
    case 'API_ABSENT':
      statusEl!.textContent = '✕ 組み込み AI 非対応'
      detailEl!.textContent =
        'この Chrome には LanguageModel API がありません。Chrome のバージョンとフラグ(chrome://flags/#prompt-api-for-gemini-nano)を確認してください。'
      break
    case 'LANG_UNAVAILABLE':
      statusEl!.textContent = '✕ 日本語モデル利用不可'
      detailEl!.textContent =
        'この Chrome/端末では日本語モデルが使えません。Chrome 149+ か "Enabled multilingual" フラグ、ハードウェア要件(空き22GB 等)を確認してください。'
      break
    case 'DOWNLOADABLE':
      statusEl!.textContent = '↓ モデル未取得'
      detailEl!.textContent =
        'ボタンを押すとモデル(数 GB)のダウンロードを開始します。'
      break
    case 'DOWNLOADING':
      statusEl!.textContent = `↓ ダウンロード中 ${Math.round(state.progress * 100)}%`
      detailEl!.textContent = '完了までしばらくお待ちください。'
      break
    case 'READY':
      statusEl!.textContent = '✓ 校正が利用可能'
      detailEl!.textContent = '対応する入力欄で日本語の校正が動作します。'
      break
    case 'ERROR':
      statusEl!.textContent = '✕ エラー'
      detailEl!.textContent = state.message
      break
  }
}

downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true
  try {
    await promptEngine.ensureReady((loaded) =>
      render({ kind: 'DOWNLOADING', progress: loaded }),
    )
    render({ kind: 'READY' })
  } catch (e) {
    render({ kind: 'ERROR', message: String(e) })
  } finally {
    downloadBtn.disabled = false
  }
})

void detectState().then(render)

// --- 設定(検出する type の ON/OFF) ---
const typeCheckboxes = Array.from(
  document.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][data-type]',
  ),
)

function currentSettings(): Settings {
  const enabledTypes = {} as Settings['enabledTypes']
  for (const box of typeCheckboxes) {
    enabledTypes[box.dataset.type as CorrectionType] = box.checked
  }
  return { enabledTypes }
}

void loadSettings().then((settings) => {
  for (const box of typeCheckboxes) {
    box.checked = settings.enabledTypes[box.dataset.type as CorrectionType]
  }
})

for (const box of typeCheckboxes) {
  box.addEventListener('change', () => {
    void saveSettings(currentSettings())
  })
}
