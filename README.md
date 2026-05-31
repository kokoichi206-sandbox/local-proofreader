# Local Proofreader

_[English](./README.md) | [日本語](./README.ja.md)_

> A privacy-first Japanese proofreading assistant for Chrome. It checks the Japanese you
> type in web input fields — **entirely on your device** using Chrome's built-in Gemini Nano.
> Nothing is ever sent to the cloud.

<!-- デモ動画/GIF をここに置きます: docs/demo.gif -->

![demo](docs/demo.gif)

## What it does

As you type, it underlines likely mistakes — typos, grammar, punctuation, and awkward
phrasing — shows a suggestion and the reason when you hover, and lets you fix just that spot
with one click. It never rewrites your text on its own.

## Features

- 🔒 **100% on-device** — your text never leaves your computer (no cloud, no sign-in)
- 〰️ **Wavy underlines** on likely mistakes, in real time as you type
- 💬 **Hover or click** an underline → suggestion + the reason → **Apply** fixes only that span
- ✋ **Never auto-corrects** — you decide what to change
- 🧩 Works in plain text boxes (`textarea` / `input`) **and rich editors like Slack and Gmail**
- ⚙️ **Choose what to detect** (typo / grammar / punctuation / awkward) from the popup.
  "Awkward phrasing" is **off by default** to avoid over-correction.

## Requirements

- **Chrome 149+** (Japanese works out of the box), or Chrome 148 with a flag (see Setup)
- Desktop only: macOS 13+, Windows 10/11, or Linux (no Android/iOS)
- About **22 GB free disk** for the model, and a GPU with **>4 GB VRAM** or **16 GB RAM + 4 CPU cores**
- The Gemini Nano model downloads once (a few GB) on first use

## Setup

1. **(Chrome 148 only) Enable Japanese**
   - `chrome://flags/#optimization-guide-on-device-model` → **Enabled**
   - `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled multilingual**
   - Restart Chrome
2. **Build and load the extension**
   ```sh
   pnpm install
   pnpm build
   ```
   Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and
   select the `.output/chrome-mv3` folder.
3. **Confirm it's ready** — open the extension popup. When it shows **"✓ 校正が利用可能"** you're set.
   If the model isn't downloaded yet, click the download button (one-time, a few GB).

## How to use

1. Click into any text box (a comment field, a Slack/Gmail message, …) and type Japanese.
2. A red wavy underline appears under likely mistakes.
3. Hover or click the underline → a tooltip shows the suggestion and why.
4. Click **適用 (Apply)** to replace just that span.
   In some editors one-click apply isn't available yet — the tooltip says so, and you can fix it manually.
5. Open the popup to turn detection types on/off.

<!-- ポップアップのスクリーンショットをここに: docs/popup.png -->

![popup](docs/popup.png)

## Privacy

Everything runs locally through Chrome's built-in Gemini Nano. Your text is never sent to any
server and no account is required. The only network activity is the one-time model download,
handled by Chrome itself.

## Supported & not supported

- **Supported:** plain `textarea` / `input[type=text]`, and many `contenteditable` editors (Slack, Gmail, …).
- **Apply may be unavailable** in some rich editors — detection and underlines still work; fix manually.
- **Not handled:** password / search / email fields (skipped on purpose), code editors, and Google Docs (canvas-rendered).

## For developers

See [CLAUDE.md](./CLAUDE.md) for setup, commands, and architecture notes.
