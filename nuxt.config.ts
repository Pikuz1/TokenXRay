const baseURL = process.env.NUXT_APP_BASE_URL ?? '/'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Token X-Ray',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Inspect what a token issuer can do on-chain: pause, freeze, mint, upgrade, admin control and holder concentration.',
        },
      ],
    },
  },
})
