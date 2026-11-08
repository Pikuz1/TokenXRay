import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from '~/app.vue'
import IndexPage from '~/pages/index.vue'

describe('app shell', () => {
  it('renders the routed page', () => {
    const wrapper = mount(App, {
      global: { stubs: { NuxtPage: { template: '<div data-test="page" />' } } },
    })
    expect(wrapper.find('[data-test="page"]').exists()).toBe(true)
  })

  it('renders the index page heading', () => {
    expect(mount(IndexPage).get('h1').text()).toBe('Token X-Ray')
  })
})
