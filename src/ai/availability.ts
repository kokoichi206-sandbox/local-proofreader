import type { EngineState } from '../state/types'

// availability()/create() に渡す言語リスト(両者で一致させる必要があるため共有する)。
// type の widening を避けるため { type: 'text', ... } のラッパは各呼び出しにインラインで書く。
export const INPUT_LANGUAGES = ['ja', 'en']
export const OUTPUT_LANGUAGES = ['ja']

// Nano の利用可否を検出する。実際の create はエンジン実装(promptClient)が持つ。
export async function detectState(): Promise<EngineState> {
  if (!('LanguageModel' in self)) {
    return { kind: 'API_ABSENT' }
  }
  try {
    const availability = await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: INPUT_LANGUAGES }],
      expectedOutputs: [{ type: 'text', languages: OUTPUT_LANGUAGES }],
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
