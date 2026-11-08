import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { ignores: ['coverage/**', 'playwright-report/**', 'test-results/**'] },
  {
    rules: {
      // Keep in step with Prettier, which writes void elements as `<input />`.
      'vue/html-self-closing': ['warn', { html: { void: 'always' } }],
    },
  },
)
