# CLAUDE.md

オンデバイス日本語校正 Chrome 拡張。機能と使い方は [README](./README.md) を参照（ここでは重複させない）。

## Stack

WXT + TypeScript(strict) + pnpm。AI は Chrome 組み込みの Gemini Nano（Prompt API / `LanguageModel`）。

## Commands

- `pnpm dev` — 開発（Chrome 起動して拡張をロード）
- `pnpm build` — 本番ビルド（`.output/chrome-mv3`）
- `pnpm test` — ユニットテスト（vitest + jsdom）
- `pnpm compile` — 型チェック（`tsc --noEmit`）
- `pnpm lint` / `pnpm format` — ESLint / Prettier

## 環境（コードから読めない前提）

- 日本語校正は **Chrome 149+ で既定**、または **Chrome 148 + `chrome://flags/#prompt-api-for-gemini-nano` = "Enabled multilingual"**。`LanguageModel` は拡張では Chrome 138+ で stable だが、**日本語モデルを DL 済みのプロファイル**でないと動かない。
- 描画と適用の正否は**実機でしか検証できない**（jsdom は CSS Custom Highlight・`getClientRects`・`execCommand` 非対応）。ロジック（offset 変換・検出・正規化）だけがユニットテスト対象。

## 守る原則（プロジェクト固有・必ず守る）

- **自動訂正しない。** 置換はユーザーが「適用」を押したときだけ。
- **誤検知 > 見逃し。** 高確信のみ指摘する。`unnatural` 型は既定オフ。
- **暗黙の fallback を作らない。** Nano 未対応/未DL や apply 非対応は黙って無効化せず、popup / ツールチップで明示する。エラーを握りつぶさない。
- **AI 出力は未信頼データ。** `src/ai/normalize.ts` で型/範囲/enum を検証し、`original` が一意出現のときだけオフセット補正。適用前は `slice===original`、適用後は再読込で検証。
- **contenteditable にノードを注入しない**（CSS Custom Highlight で描画）。置換は `execCommand('insertText')` 経由のみで、`canApply`（`queryCommandSupported`）でゲートする。
- コメントは Why のみ。

## アーキテクチャの継ぎ目

- 入力面は `src/target/`（`EditableTarget`）で抽象化。新しい入力面（別エディタ等）を足すときは**ここに実装を増やし**、`overlay/tooltip`・`ai`(promptEngine)・`settings/filter`・`ai/normalize` は再利用する。
- AI は `ProofreadEngine`（`src/ai/client.ts`）。Proofreader API（Chrome 149+）へ差し替え可能に保つ。

## 落とし穴

- pnpm 環境で `prettier .` が node_modules の symlink を辿りストアまで整形しようとする。format/format:check は `.` ではなく scoped glob。**`.` に戻さない。**
- この環境の pnpm は `~` を展開できず cwd 相対に store を誤生成する。`/~` は gitignore 済み。**コミットに含めない。**
