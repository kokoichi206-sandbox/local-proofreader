// Prompt API の responseConstraint に渡す JSON Schema。
// 理由(reason)は含めない: 自由文を常時の構造化出力に混ぜると JSON が壊れやすい(Phase 0 で確認)。
// 理由はツールチップを開いたときに promptEngine.explain で別途生成する。
export const CORRECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['corrections'],
  properties: {
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['start', 'end', 'original', 'suggestion', 'type'],
        properties: {
          start: {
            type: 'integer',
            description: '元テキストへの文字オフセット(開始)',
          },
          end: {
            type: 'integer',
            description: '元テキストへの文字オフセット(終了, 排他的)',
          },
          original: {
            type: 'string',
            description: '元テキストの該当部分そのまま',
          },
          suggestion: { type: 'string', description: '修正案' },
          type: {
            type: 'string',
            enum: ['typo', 'grammar', 'punctuation', 'unnatural'],
          },
        },
      },
    },
  },
}

export const SYSTEM_PROMPT = [
  'あなたは厳格な日本語の校正者です。',
  '入力テキストに明確な誤り(誤字脱字・文法の誤り・句読点・明らかに不自然な表現)がある箇所だけを指摘します。',
  '正しい文には何も指摘してはいけません。確信が持てない箇所は指摘しないでください(誤検出は見逃しより有害)。',
  'start/end は入力テキストの文字単位オフセットで、original は入力の該当部分と完全に一致させること。',
  '固有名詞・専門用語・意図的なくだけた表現は誤りとみなさないこと。',
].join('\n')
