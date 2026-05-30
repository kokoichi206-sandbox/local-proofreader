import { defineConfig } from 'wxt'

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Local Proofreader',
    description: '完全ローカルの Gemini Nano による日本語校正アシスタント',
    // Prompt API (LanguageModel) は拡張では Chrome 138+ で stable のため permission 宣言は不要。
    // storage はポップアップの状態/設定の保存に使う。
    permissions: ['storage'],
  },
})
