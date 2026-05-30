/*
 * フェーズ0: Gemini Nano（Prompt API）日本語校正の精度 素振り
 * ------------------------------------------------------------------
 * 使い方:
 *   1) phase0/README.md の手順で chrome://flags を設定し Chrome を再起動
 *   2) https ページ（例: https://developer.chrome.com/）または localhost を開く
 *   3) DevTools の Console を開き、このファイルの中身を丸ごと貼り付けて実行
 *
 * 目的（go/no-go 判定の材料）:
 *   - 正しい文での誤検出率（false positive）: 本プロジェクトの最重要指標
 *   - 誤りのある文での検出漏れ（miss）
 *   - 返ってくる start/end オフセットが元文字列と一致するか（オフセット信頼度）
 *   - responseConstraint で JSON が安定して返るか
 *
 * 注意: これは検証用ハーネスであり、製品コードではない。
 *       各文ごとの例外は握りつぶさず、結果表に「error」として明示する。
 */

;(async () => {
  // --- 評価データセット（clean=true の文に1件でも指摘が出たら false positive） ---
  const DATASET = [
    // 誤字脱字（機械的・検出されるべき）
    {
      id: 't1',
      category: 'typo',
      clean: false,
      text: '資料を添付しますのて、ご確認ください。',
    },
    {
      id: 't2',
      category: 'typo',
      clean: false,
      text: '明日の会議わ10時から始まります。',
    },
    {
      id: 't3',
      category: 'typo',
      clean: false,
      text: '私はリンゴを たべした。',
    },
    {
      id: 't4',
      category: 'typo',
      clean: false,
      text: 'プロジェクトの進捗を報告いたしす。',
    },
    {
      id: 't5',
      category: 'typo',
      clean: false,
      text: 'ご質問がある場合わ、お知らせくたさい。',
    },

    // 文法（活用・時制の誤り・検出されるべき）
    {
      id: 'g1',
      category: 'grammar',
      clean: false,
      text: '彼は昨日学校に行きませんかった。',
    },
    {
      id: 'g2',
      category: 'grammar',
      clean: false,
      text: 'この問題はとても難しいでした。',
    },
    {
      id: 'g3',
      category: 'grammar',
      clean: false,
      text: '昨日は雨が降っていたので、試合は中止になりますでした。',
    },

    // 正しい文（指摘ゼロが正解・誤検出テスト）
    {
      id: 'c1',
      category: 'correct',
      clean: true,
      text: '本日はお忙しい中、ご出席いただきありがとうございます。',
    },
    {
      id: 'c2',
      category: 'correct',
      clean: true,
      text: '明日の打ち合わせは14時から会議室Aで行います。',
    },
    {
      id: 'c3',
      category: 'correct',
      clean: true,
      text: 'システムの再起動が完了しましたので、ご確認ください。',
    },
    {
      id: 'c4',
      category: 'correct',
      clean: true,
      text: '週末は天気が良ければ、家族で公園に行く予定です。',
    },
    {
      id: 'c5',
      category: 'correct',
      clean: true,
      text: 'ご不明な点がございましたら、お気軽にお問い合わせください。',
    },
    {
      id: 'c6',
      category: 'correct',
      clean: true,
      text: '添付の資料をご確認のうえ、ご意見をいただけますと幸いです。',
    },

    // 不自然な日本語（主観的・過剰訂正リスクの高い領域）
    {
      id: 'u1',
      category: 'unnatural',
      clean: false,
      text: '私は昨日友達と映画を見るに行きました。',
    },
    {
      id: 'u2',
      category: 'unnatural',
      clean: false,
      text: '彼の説明はとても分かりやすいでした。',
    },
    {
      id: 'u3',
      category: 'unnatural',
      clean: false,
      text: 'この件についき、後ほどご連絡させていただくます。',
    },
  ]

  // --- responseConstraint 用 JSON Schema（src/ai/schema.ts と同型） ---
  const SCHEMA = {
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
            reason: { type: 'string', description: '修正理由(日本語, 簡潔に)' },
          },
        },
      },
    },
  }

  const SYSTEM_PROMPT = [
    'あなたは厳格な日本語の校正者です。',
    '入力テキストに明確な誤り(誤字脱字・文法の誤り・句読点・明らかに不自然な表現)がある箇所だけを指摘します。',
    '正しい文には何も指摘してはいけません。確信が持てない箇所は指摘しないでください(誤検出は見逃しより有害)。',
    'start/end は入力テキストの文字単位オフセットで、original は入力の該当部分と完全に一致させること。',
    '固有名詞・専門用語・意図的なくだけた表現は誤りとみなさないこと。',
  ].join('\n')

  // --- オフセット再検証: original が start/end と一致しなければ indexOf で補正 ---
  function revalidateOffset(text, c) {
    const sliced = text.slice(c.start, c.end)
    if (sliced === c.original)
      return { ...c, offsetValid: true, offsetRepaired: false }
    const i = text.indexOf(c.original)
    if (i >= 0 && c.original.length > 0) {
      return {
        ...c,
        start: i,
        end: i + c.original.length,
        offsetValid: true,
        offsetRepaired: true,
      }
    }
    return { ...c, offsetValid: false, offsetRepaired: false }
  }

  // --- 前提チェック ---
  if (!('LanguageModel' in self)) {
    console.error(
      '[phase0] LanguageModel がこのブラウザに存在しません。\n' +
        'Chrome のバージョン/フラグを確認してください(phase0/README.md 参照)。',
    )
    return
  }

  const options = {
    expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
    expectedOutputs: [{ type: 'text', languages: ['ja'] }],
  }

  const availability = await LanguageModel.availability(options)
  console.log('[phase0] availability =', availability)
  if (availability === 'unavailable') {
    console.error(
      '[phase0] このブラウザ/オプションでは日本語モデルが利用できません(unavailable)。\n' +
        '・Chrome 148 の場合 chrome://flags/#prompt-api-for-gemini-nano を "Enabled multilingual" に\n' +
        '・ハードウェア要件(空き22GB / VRAM>4GB or RAM16GB+4コア)を満たすか chrome://on-device-internals で確認',
    )
    return
  }

  console.log(
    '[phase0] セッションを作成します(必要ならモデルDLが走ります。進捗を表示)...',
  )
  const session = await LanguageModel.create({
    ...options,
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        console.log(`[phase0] モデルDL: ${Math.round(e.loaded * 100)}%`)
      })
    },
  })
  console.log('[phase0] セッション準備完了。')

  const PROMPT_TIMEOUT_MS = 60000
  const OMIT_CONSTRAINT_INPUT = true
  const LIMIT = 0 // 0 = 全件。3 などにすると先頭 N 件だけ評価(動作確認・高速化用)

  // ウォームアップ: 初回推論コストを切り分ける。ここで止まるなら responseConstraint 以前の問題。
  console.log('[phase0] ウォームアップ中(初回推論は数十秒かかる場合あり)...')
  const warmStart = performance.now()
  try {
    const w = await session.clone()
    await w.prompt('「OK」とだけ返してください。', {
      signal: AbortSignal.timeout(120000),
    })
    w.destroy()
    console.log(
      `[phase0] ウォームアップ完了 (${Math.round(performance.now() - warmStart)}ms)`,
    )
  } catch (e) {
    console.warn('[phase0] ウォームアップ失敗(続行):', String(e))
  }

  const items = LIMIT > 0 ? DATASET.slice(0, LIMIT) : DATASET
  console.log(`[phase0] ${items.length} 件を評価します。`)
  const rows = []
  let i = 0
  for (const item of items) {
    i++
    const label = `${i}/${items.length} ${item.id}(${item.category})`
    console.log(`[phase0] ${label} 評価中... "${item.text}"`)
    const started = performance.now()
    // 各文を独立に評価するためセッションを clone する。
    // 1セッションで逐次評価すると会話履歴が蓄積し、後続が遅くなり前の指摘にバイアスされる。
    let convo
    try {
      convo = await session.clone()
      const opts = {
        responseConstraint: SCHEMA,
        signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
      }
      if (OMIT_CONSTRAINT_INPUT) opts.omitResponseConstraintInput = true
      const raw = await convo.prompt(
        `次の日本語を校正してください。\n---\n${item.text}`,
        opts,
      )
      const ms = Math.round(performance.now() - started)
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (e) {
        console.warn(`[phase0] ${label}: JSON parse 失敗 (${ms}ms)`, raw)
        rows.push({
          id: item.id,
          category: item.category,
          clean: item.clean,
          ms,
          status: 'JSON_PARSE_ERROR',
          text: item.text,
        })
        continue
      }
      const corrections = (parsed.corrections ?? []).map((c) =>
        revalidateOffset(item.text, c),
      )
      const isFalsePositive = item.clean && corrections.length > 0
      const isMiss = !item.clean && corrections.length === 0
      const offsetBad = corrections.filter((c) => !c.offsetValid).length
      const suggestions = corrections
        .map((c) => `[${c.type}] "${c.original}"→"${c.suggestion}"`)
        .join(' / ')
      console.log(
        `[phase0] ${label}: ${corrections.length}件 (${ms}ms)` +
          `${isFalsePositive ? ' ⚠FP' : ''}${isMiss ? ' ⚠miss' : ''} ${suggestions}`,
      )
      rows.push({
        id: item.id,
        category: item.category,
        clean: item.clean,
        n: corrections.length,
        falsePositive: isFalsePositive,
        miss: isMiss,
        offsetInvalid: offsetBad,
        ms,
        text: item.text,
        suggestions,
      })
    } catch (e) {
      const ms = Math.round(performance.now() - started)
      const timedOut = Boolean(e) && e.name === 'TimeoutError'
      console.error(
        `[phase0] ${label}: ${timedOut ? 'TIMEOUT' : '例外'} (${ms}ms)`,
        e,
      )
      rows.push({
        id: item.id,
        category: item.category,
        clean: item.clean,
        ms,
        status: timedOut ? 'TIMEOUT' : 'ERROR',
        error: String(e),
        text: item.text,
      })
    } finally {
      convo?.destroy()
    }
  }

  console.table(rows)

  // --- サマリ ---
  const cleanRows = rows.filter((r) => r.clean === true)
  const dirtyRows = rows.filter((r) => r.clean === false)
  const fp = cleanRows.filter((r) => r.falsePositive).length
  const miss = dirtyRows.filter((r) => r.miss).length
  const offsetIssues = rows.reduce((s, r) => s + (r.offsetInvalid ?? 0), 0)

  console.log('==================== phase0 サマリ ====================')
  console.log(
    `正しい文: ${cleanRows.length}件中 誤検出(false positive) = ${fp}件  ← 最重要・低いほど良い`,
  )
  console.log(`誤りの文: ${dirtyRows.length}件中 見逃し(miss) = ${miss}件`)
  console.log(
    `オフセット不一致(補正不能) = ${offsetIssues}件  ← 多いと Prompt 単独は厳しい`,
  )
  console.log('=======================================================')
  console.log(
    '判断の目安: false positive が 0〜1件なら有望。3件以上なら高確信フィルタ設計が必須。',
  )

  session.destroy()
})()
