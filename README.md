# local-proofreader

完全ローカルの **Gemini Nano** で、Web 上の入力欄に打った日本語の誤字脱字・不自然さを検出し、
波線 + ツールチップで「直す/直さない」をユーザーに委ねる Chrome 拡張。クラウドに一切送らない、
プライバシー重視の日本語特化校正アシスタント。

## 方針(確定事項)

- **自動訂正はしない**。波線で提案し、クリックされて初めて該当範囲だけ置換する(Grammarly 方式)。
- **暗黙の fallback 禁止**。Nano 未対応/未取得時は黙って無効化せず、状態を明示する。
- **誤検知 > 見逃し**。高確信の指摘だけを出す。
- v1 対象は `<textarea>` と単純な `<input type=text>` のみ。contenteditable / Google Docs は対象外。

## 技術スタック

- ビルド: [WXT](https://wxt.dev)(Vite ベース、MV3)
- 言語: TypeScript(strict)
- AI: Chrome 組み込み AI。当面 **Prompt API(LanguageModel)** を共通インターフェース越しに利用し、
  Proofreader API が日本語 stable になったら同インターフェースの別実装へ差し替える。

> **重要(環境)**: 日本語の Proofreader API は **Chrome 149+** が必要。手元が **Chrome 148** の場合は
> Prompt API を `chrome://flags/#prompt-api-for-gemini-nano` = **"Enabled multilingual"** で使う。
> 詳細・要件は [`phase0/README.md`](./phase0/README.md) を参照。

## セットアップ

```sh
pnpm install        # postinstall で wxt prepare が走る
pnpm dev            # 開発(Chrome を起動して拡張をロード)
pnpm build          # 本番ビルド(.output/ に出力)
pnpm compile        # 型チェック(tsc --noEmit)
pnpm lint           # ESLint
pnpm format:check   # Prettier チェック
```

## 進め方(フェーズ)

| Phase | 内容                                                 | Nano 実機      |
| ----- | ---------------------------------------------------- | -------------- |
| **0** | コンソールで Nano 日本語校正精度を検証(go/no-go)     | 要             |
| 1     | WXT 足場(background / content / popup)               | 不要           |
| 2     | 入力検出 + IME/デバウンス監視                        | 不要           |
| 3     | オーバーレイ mirror 描画(波線・座標・スクロール同期) | 不要(モックで) |
| 4     | AI 統合 + availability 状態機械                      | 要             |
| 5     | 範囲置換 + キャッシュ + 高確信フィルタ               | 要             |

**現状**: Phase 1/2 まで実装済み。Phase 0(`phase0/`)を実機で走らせ、精度を確認してから Phase 3 以降へ進む。

## ディレクトリ

```
entrypoints/        WXT エントリ(background / content / popup)
src/
  ai/               AI クライアント抽象 + Prompt 実装 + 状態検出 + 正規化 + JSON Schema
  input/            校正対象の検出 + IME/デバウンス監視
  state/            状態 enum / 型定義
phase0/             Nano 精度検証ハーネス(コンソール用 + 手順)
```
