import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: ['coverage/**', 'playwright-report/**', 'test-results/**'],
})
