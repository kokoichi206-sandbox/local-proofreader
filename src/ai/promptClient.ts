import type { Correction } from '../state/types'
import type { ProofreadEngine } from './client'
import { CORRECTION_SCHEMA, SYSTEM_PROMPT } from './schema'
import { repairOffsets } from './normalize'

// LanguageModel.create の戻り値の型を API から導出する(ライブラリの型名に依存しない)。
type Session = Awaited<ReturnType<typeof LanguageModel.create>>

interface NanoResponse {
  corrections?: Correction[]
}

const PROMPT_TIMEOUT_MS = 15000

// Prompt API(Gemini Nano)による校正エンジン。
class PromptClient implements ProofreadEngine {
  readonly name = 'prompt-api'
  private session: Session | null = null

  async ensureReady(onProgress?: (loaded: number) => void): Promise<void> {
    if (this.session) return
    if (!('LanguageModel' in self)) {
      throw new Error('LanguageModel API がこのブラウザに存在しません')
    }
    this.session = await LanguageModel.create({
      expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
      expectedOutputs: [{ type: 'text', languages: ['ja'] }],
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const { loaded } = e as ProgressEvent
          onProgress?.(loaded)
        })
      },
    })
  }

  async proofread(text: string): Promise<Correction[]> {
    // 空・空白のみは指摘なしが正しい結果。AI を呼ばずに即返す(どの呼び出し経路でも守る不変条件)。
    if (text.trim().length === 0) return []
    const session = this.session
    if (!session) {
      throw new Error('proofread の前に ensureReady を呼んでください')
    }

    let parsed: NanoResponse
    try {
      parsed = JSON.parse(
        await this.runStructured(session, text),
      ) as NanoResponse
    } catch {
      // 構造化出力がまれに壊れる(Phase 0 で確認)。1回だけ再試行する。
      try {
        parsed = JSON.parse(
          await this.runStructured(session, text),
        ) as NanoResponse
      } catch (e) {
        throw new Error(`Nano 応答の JSON 解析に2回失敗: ${String(e)}`)
      }
    }
    const list = Array.isArray(parsed.corrections) ? parsed.corrections : []
    return repairOffsets(text, list)
  }

  // 理由はツールチップを開いたときだけ生成する(常時パスに自由文を混ぜると JSON が壊れやすいため)。
  async explain(text: string, correction: Correction): Promise<string> {
    const session = this.session
    if (!session) {
      throw new Error('explain の前に ensureReady を呼んでください')
    }
    const convo = await session.clone()
    try {
      const result = await convo.prompt(
        `次の文で「${correction.original}」を「${correction.suggestion}」に直す理由を、日本語で簡潔に1文で説明してください。\n---\n${text}`,
        { signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS) },
      )
      return result.trim()
    } finally {
      convo.destroy()
    }
  }

  // 各校正を独立コンテキストで実行する(会話履歴の蓄積による低速化/バイアスを防ぐ)。
  private async runStructured(session: Session, text: string): Promise<string> {
    const convo = await session.clone()
    try {
      return await convo.prompt(
        `次の日本語を校正してください。\n---\n${text}`,
        {
          responseConstraint: CORRECTION_SCHEMA,
          signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
        },
      )
    } finally {
      convo.destroy()
    }
  }

  destroy(): void {
    this.session?.destroy()
    this.session = null
  }
}

export const promptEngine: ProofreadEngine = new PromptClient()
