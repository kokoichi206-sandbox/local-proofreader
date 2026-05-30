import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // detect/apply は DOM(textarea/input)を使うため jsdom 環境で動かす。
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
