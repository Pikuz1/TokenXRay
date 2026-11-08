import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { PLAIN_TOKEN_ABI } from '@fixtures/abis'
import { setAnalyticsSink } from '~/composables/useTracker'
import { DataError } from '~/utils/data/http'
import { createMemorySink } from '~/utils/analytics'
import { SAMPLE_OPTIONS } from '~/utils/analysis/samples'

const OWNER: Address = '0x1111111111111111111111111111111111111111'
const TOKEN: Address = '0x2222222222222222222222222222222222222222'

const fakeDeps = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('~/utils/analysis/defaults', () => ({
  createDefaultDeps: () => fakeDeps.current,
}))

function liveDeps(overrides: Record<string, unknown> = {}) {
  return {
    explorer: {
      getToken: vi.fn().mockResolvedValue({
        name: 'Test Token',
        symbol: 'TST',
        decimals: 6,
        totalSupply: 1000n,
        holdersCount: 2,
      }),
      getContract: vi.fn().mockResolvedValue({
        isVerified: true,
        isProxy: false,
        abi: PLAIN_TOKEN_ABI,
        implementations: [],
      }),
      getHolders: vi.fn().mockResolvedValue([{ address: OWNER, value: 500n }]),
      ...overrides,
    },
    chain: {
      getStorageAt: vi.fn().mockResolvedValue('0x'),
      getCode: vi.fn().mockResolvedValue('0x'),
      readContract: vi.fn().mockResolvedValue(OWNER),
    },
  }
}

async function mountPage() {
  const { default: IndexPage } = await import('~/pages/index.vue')
  return mount(IndexPage)
}

beforeEach(() => {
  fakeDeps.current = liveDeps()
})
afterEach(() => setAnalyticsSink())

describe('index page', () => {
  it('introduces the tool and its limits before any search', async () => {
    const wrapper = await mountPage()
    expect(wrapper.get('h1').text()).toBe('Token X-Ray')
    expect(wrapper.text()).toContain('A power is not automatically a flaw')
    expect(wrapper.text()).toContain('not a rating, an audit or investment advice')
    expect(wrapper.find('[aria-label="Results"]').exists()).toBe(false)
  })

  it('analyses a typed address and shows every card with data confidence', async () => {
    const wrapper = await mountPage()
    await wrapper.get('input').setValue(TOKEN)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Test Token')
    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(wrapper.text()).toContain('7 of 7 checks completed')
    expect(wrapper.text()).not.toContain('Reading the holder list')
  })

  it('shows the other cards while the holder list is still loading', async () => {
    fakeDeps.current = liveDeps({ getHolders: vi.fn(() => new Promise(() => {})) })
    const wrapper = await mountPage()
    await wrapper.get('input').setValue(TOKEN)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(wrapper.text()).toContain('Reading the holder list')
    expect(wrapper.text()).not.toContain('checks completed')
  })

  it('shows a friendly message for an invalid address', async () => {
    const wrapper = await mountPage()
    await wrapper.get('input').setValue('not an address')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'does not look like an Ethereum address',
    )
    expect(wrapper.find('[aria-label="Results"]').exists()).toBe(false)
  })

  it('tracks a sample click and falls back to saved data when offline', async () => {
    const down = vi.fn().mockRejectedValue(new DataError('network', 'offline'))
    fakeDeps.current = liveDeps({ getToken: down, getContract: down })
    const sink = createMemorySink()
    setAnalyticsSink(sink)

    const wrapper = await mountPage()
    await wrapper.get('.form__sample').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Sample data')
    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(sink.events[0]).toEqual({
      event: 'sample_token_clicked',
      props: { symbol: SAMPLE_OPTIONS[0]!.label },
    })
    expect(sink.events[1]).toEqual({
      event: 'address_submitted',
      props: { origin: 'sample', valid: true },
    })
  })

  it('disables the form while loading', async () => {
    fakeDeps.current = liveDeps({ getToken: vi.fn(() => new Promise(() => {})) })
    const wrapper = await mountPage()
    await wrapper.get('input').setValue(TOKEN)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('.page__status').text()).toBe('Reading the contract…')
    expect(wrapper.get('.form__submit').attributes('disabled')).toBeDefined()
  })
})
