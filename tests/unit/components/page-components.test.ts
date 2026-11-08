import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AddressForm from '~/components/AddressForm.vue'
import PendingCard from '~/components/PendingCard.vue'
import TokenHeader from '~/components/TokenHeader.vue'
import type { TokenSummary } from '~/types/analysis'

const samples = [
  { address: '0x1111111111111111111111111111111111111111', label: 'AAA' },
  { address: '0x2222222222222222222222222222222222222222', label: 'BBB' },
] as const

const formProps = { samples, busy: false, error: null }

describe('AddressForm', () => {
  it('emits the typed value on submit', async () => {
    const wrapper = mount(AddressForm, { props: formProps })
    await wrapper.get('input').setValue('0xabc')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toEqual([['0xabc']])
  })

  it('fills the input and emits when a sample is picked', async () => {
    const wrapper = mount(AddressForm, { props: formProps })
    const buttons = wrapper.findAll('.form__sample')
    expect(buttons.map((button) => button.text())).toEqual(['AAA', 'BBB'])

    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('pick')).toEqual([[samples[1]]])
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe(samples[1].address)
  })

  it('shows an accessible error', () => {
    const wrapper = mount(AddressForm, { props: { ...formProps, error: 'Bad address' } })
    const error = wrapper.get('[role="alert"]')
    expect(error.text()).toBe('Bad address')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(
      error.attributes('id'),
    )
  })

  it('has no error markup when there is no error', () => {
    const wrapper = mount(AddressForm, { props: formProps })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('false')
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('disables actions while busy', () => {
    const wrapper = mount(AddressForm, { props: { ...formProps, busy: true } })
    expect(wrapper.get('.form__submit').text()).toBe('Checking…')
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('disabled')).toBeDefined()
    }
  })
})

describe('PendingCard', () => {
  it('announces what it is waiting for', () => {
    const wrapper = mount(PendingCard, { props: { question: 'Q?', message: 'Waiting' } })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toBe('Waiting')
    expect(wrapper.text()).toContain('Q?')
  })
})

describe('TokenHeader', () => {
  const token: TokenSummary = {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    totalSupply: '1',
    holdersCount: 1,
  }
  const base = {
    token,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    source: 'live',
    fetchedAt: '2026-11-08T14:00:00.000Z',
  } as const

  it('shows the token identity for live data', () => {
    const wrapper = mount(TokenHeader, { props: base })
    expect(wrapper.text()).toContain('USD Coin')
    expect(wrapper.text()).toContain('USDC')
    expect(wrapper.text()).toContain('0xA0b8…eB48')
    expect(wrapper.text()).toContain('data read 2026-11-08')
    expect(wrapper.find('code').attributes('title')).toBe(base.address)
    expect(wrapper.text()).not.toContain('Sample data')
  })

  it('flags sample data and explains why', () => {
    const wrapper = mount(TokenHeader, { props: { ...base, source: 'sample' } })
    expect(wrapper.text()).toContain('Sample data')
    expect(wrapper.text()).toContain('saved sample from 2026-11-08')
  })

  it('copes with missing name and symbol', () => {
    const unnamed = { ...token, name: null, symbol: null }
    const wrapper = mount(TokenHeader, { props: { ...base, token: unnamed } })
    expect(wrapper.text()).toContain('Unnamed token')
    expect(wrapper.find('.token__symbol').exists()).toBe(false)
  })
})
