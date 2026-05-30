import { defineBackground } from '#imports'

// Service Worker。組み込み AI は SW では呼べない(Proofreader/Rewriter は Worker 非対応、
// Prompt も document 文脈推奨)ため、ここでは状態調整・将来のメッセージ中継のみを担う。
export default defineBackground(() => {
  // 現時点では常駐処理なし。content script / popup が各 document 文脈で AI を扱う。
})
