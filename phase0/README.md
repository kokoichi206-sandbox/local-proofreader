# フェーズ0: Nano 日本語校正精度の検証

着工の前に、**Gemini Nano が日本語校正に使えるか**を実機で確かめる go/no-go ゲートです。
ここで「正しい文に誤検出が出すぎる」「オフセットが当てにならない」と分かれば、後続の重い
オーバーレイ実装に進む前に方針を見直せます（コンセプト §11 フェーズ0）。

## 1. 環境要件

- macOS 13+ / Windows 10,11 / Linux（Android・iOS 非対応）
- Chrome プロファイルのあるボリュームに **空き 22GB 以上**
- GPU VRAM **4GB 超**、または CPU **RAM 16GB + 4コア以上**
- まず `chrome://on-device-internals`（Model Status タブ）で端末が要件を満たすか確認

## 2. フラグ設定（Chrome 148 の場合）

> 手元の Chrome は **148**。日本語 Proofreader API は **149 以降**でないと動かないため、
> フェーズ0 では **Prompt API（LanguageModel）** で検証する。

1. `chrome://flags/#optimization-guide-on-device-model` → **Enabled**
2. `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled multilingual**
   （単なる `Enabled` だと英語のみ。日本語には **multilingual** が必須）
3. Chrome を **完全に再起動**（Relaunch ボタン）
4. `chrome://on-device-internals` でモデルがダウンロード可能/済みか確認

> 注: 148 で「multilingual フラグさえ立てれば日本語が確実に動く」かは確度 medium。
> もし `availability` が `unavailable` のままなら、Chrome 149+（Dev/Beta/Canary）の導入を検討。

## 3. 実行

1. https のページ（例: `https://developer.chrome.com/`）または `localhost` を開く
   （`file://` は避ける。Prompt API はセキュアコンテキストが必要）
2. DevTools → Console を開く
3. `phase0/console-validate.js` の中身を**丸ごと貼り付けて Enter**
   - 初回はモデルのダウンロード（数 GB）が走ることがある。進捗が Console に出る
   - ダウンロードが始まらない場合、一度ページ内を**クリック**してから再実行（ユーザー操作が必要なため）

## 4. 結果の読み方（go/no-go の目安）

`console.table` と末尾サマリを見る。

| 指標               | 意味                                             | 目安                                            |
| ------------------ | ------------------------------------------------ | ----------------------------------------------- |
| **false positive** | 正しい文（`clean`）への誤検出                    | **0〜1件なら有望**。3件以上は高確信フィルタ必須 |
| **miss**           | 誤りの文の見逃し                                 | 誤字・文法はある程度拾えてほしい                |
| **offsetInvalid**  | start/end が元文字列と一致せず補正もできない件数 | 多いと Prompt 単独でのウェーブ下線は厳しい      |

- **false positive が低く、誤字/文法をそれなりに拾える** → そのまま実装へ。
- **不自然(unnatural)系だけ誤検出が多い** → v1 は誤字/文法に絞り、unnatural は type 別 OFF で出す。
- **全体に誤検出だらけ / オフセットが壊滅** → Chrome 149+ で Proofreader API を試す方針に切替を検討。

## 5. データセットの拡張

`console-validate.js` 冒頭の `DATASET` に自分のユースケース（メール下書き、社内用語など）の文を
`clean: true/false` を付けて足すと、より実態に即した判定ができる。このデータセットは将来
回帰テスト（精度が劣化していないかの自動チェック）の土台にもなる。
