import { DEFAULT_SETTINGS, type Settings } from './types'

const STORAGE_KEY = 'settings'

// 保存値と既定をマージする。将来 type を追加しても欠損キーを既定で補える。
function merge(stored: Partial<Settings> | undefined): Settings {
  return {
    enabledTypes: {
      ...DEFAULT_SETTINGS.enabledTypes,
      ...stored?.enabledTypes,
    },
  }
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(STORAGE_KEY)
  return merge(got[STORAGE_KEY] as Partial<Settings> | undefined)
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}

// 設定変更を購読する。popup での保存が content script 側にも届く(別コンテキスト同期)。
export function onSettingsChanged(
  callback: (settings: Settings) => void,
): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return
    callback(
      merge(changes[STORAGE_KEY].newValue as Partial<Settings> | undefined),
    )
  })
}
