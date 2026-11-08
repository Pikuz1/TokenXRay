import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('./fixtures', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}'],
      exclude: ['app/types/**'],
      reporter: ['text', 'html'],
      thresholds: {
        100: true,
      },
    },
  },
})
