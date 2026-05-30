import type { EngineState } from '../state/types'

// availability()/create() には同じ options を渡す必要がある。
// 型の widening を避けるためオプションは各呼び出しにインラインで書く(共有 const にしない)。
// ここは検出専用。実際の create はエンジン実装(promptClient)が持つ。
export async function detectState(): Promise<EngineState> {
  if (!('LanguageModel' in self)) {
    return { kind: 'API_ABSENT' }
  }
  try {
    const availability = await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
      expectedOutputs: [{ type: 'text', languages: ['ja'] }],
    })
    switch (availability) {
      case 'unavailable':
        return { kind: 'LANG_UNAVAILABLE' }
      case 'downloadable':
        return { kind: 'DOWNLOADABLE' }
      case 'downloading':
        return { kind: 'DOWNLOADING', progress: 0 }
      case 'available':
        return { kind: 'READY' }
      default:
        return {
          kind: 'ERROR',
          message: `unknown availability: ${String(availability)}`,
        }
    }
  } catch (e) {
    return { kind: 'ERROR', message: String(e) }
  }
}
