import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import CheckCard from '~/components/CheckCard.vue'
import ConcentrationBar from '~/components/ConcentrationBar.vue'
import ConfidenceNote from '~/components/ConfidenceNote.vue'
import ExplainTip from '~/components/ExplainTip.vue'
import PowerCard from '~/components/PowerCard.vue'
import { setAnalyticsSink } from '~/composables/useTracker'
import { createMemorySink } from '~/utils/analytics'
import type { AnyCheckResult } from '~/types/analysis'

afterEach(() => setAnalyticsSink())

describe('ExplainTip', () => {
  it('starts collapsed and opens on click, announcing it once per opening', async () => {
    const wrapper = mount(ExplainTip, { props: { text: 'Because.' } })
    const button = wrapper.get('button')
    const panel = wrapper.get('p')

    expect(button.attributes('aria-expanded')).toBe('false')
    expect(panel.attributes('style')).toContain('display: none')
    expect(button.attributes('aria-controls')).toBe(panel.attributes('id'))

    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(panel.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.emitted('open')).toHaveLength(1)

    await button.trigger('click')
    expect(panel.attributes('style')).toContain('display: none')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})

describe('PowerCard', () => {
  const props = {
    question: 'Can it pause?',
    tone: 'attention',
    badge: 'Can pause',
    headline: 'Issuer can pause all transfers',
    detail: 'Functions found: pause',
    whyItMatters: 'Because.',
  } as const

  it('renders the content with a tone class and a slot', () => {
    const wrapper = mount(PowerCard, { props, slots: { default: '<i class="extra" />' } })
    expect(wrapper.classes()).toContain('card--attention')
    expect(wrapper.text()).toContain('Can it pause?')
    expect(wrapper.text()).toContain('Can pause')
    expect(wrapper.text()).toContain('Functions found: pause')
    expect(wrapper.find('.extra').exists()).toBe(true)
  })

  it('omits the detail line when there is none', () => {
    const wrapper = mount(PowerCard, { props: { ...props, detail: null } })
    expect(wrapper.find('.card__detail').exists()).toBe(false)
  })

  it('re-emits when the explanation is opened', async () => {
    const wrapper = mount(PowerCard, { props })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('explain')).toHaveLength(1)
  })
})

describe('ConfidenceNote', () => {
  it('summarises a complete analysis without a caveat', () => {
    const wrapper = mount(ConfidenceNote, {
      props: { confidence: { completed: 7, total: 7 } },
    })
    expect(wrapper.text()).toContain('7 of 7 checks completed')
    expect(wrapper.text()).not.toContain('Unknown')
  })

  it('explains what unknown means for a partial analysis', () => {
    const wrapper = mount(ConfidenceNote, {
      props: { confidence: { completed: 5, total: 7 } },
    })
    expect(wrapper.text()).toContain('5 of 7 checks completed')
    expect(wrapper.text()).toContain('not that the answer is no')
  })
})

describe('ConcentrationBar', () => {
  it('sizes both segments and labels them for assistive technology', () => {
    const wrapper = mount(ConcentrationBar, { props: { top1: 6.42, top10: 23.92 } })
    expect(wrapper.attributes('aria-label')).toBe(
      'Largest wallet 6.4%, top 10 wallets 23.9% of supply',
    )
    expect(wrapper.get('.bar__top10').attributes('style')).toContain('width: 23.92%')
    expect(wrapper.get('.bar__top1').attributes('style')).toContain('width: 6.42%')
  })

  it('keeps widths within 0 to 100 percent', () => {
    const wrapper = mount(ConcentrationBar, { props: { top1: -5, top10: 140 } })
    expect(wrapper.get('.bar__top10').attributes('style')).toContain('width: 100%')
    expect(wrapper.get('.bar__top1').attributes('style')).toContain('width: 0%')
  })
})

describe('CheckCard', () => {
  const pause: AnyCheckResult = { id: 'pause', status: 'yes', evidence: ['pause'] }
  const unknown: AnyCheckResult = { id: 'mint', status: 'unknown', evidence: [] }

  it('renders the wording for a check', () => {
    const wrapper = mount(CheckCard, { props: { result: pause } })
    expect(wrapper.text()).toContain('Can the issuer pause all transfers?')
    expect(wrapper.text()).toContain('Issuer can pause all transfers')
    expect(wrapper.text()).toContain('Functions found: pause')
    expect(wrapper.find('.bar').exists()).toBe(false)
  })

  it('draws the concentration bar for concentration results', () => {
    const result: AnyCheckResult = {
      id: 'concentration',
      status: 'yes',
      evidence: [],
      level: 'medium',
      top1: 10,
      top10: 40,
    }
    expect(mount(CheckCard, { props: { result } }).find('.bar').exists()).toBe(true)
  })

  it('skips the bar when concentration is unknown', () => {
    const result: AnyCheckResult = {
      id: 'concentration',
      status: 'unknown',
      evidence: [],
      level: 'unknown',
      top1: null,
      top10: null,
    }
    const wrapper = mount(CheckCard, { props: { result } })
    expect(wrapper.find('.bar').exists()).toBe(false)
    expect(wrapper.text()).toContain('Unknown')
  })

  it('skips the bar when only the top 10 share is missing', () => {
    const result: AnyCheckResult = {
      id: 'concentration',
      status: 'yes',
      evidence: [],
      level: 'low',
      top1: 5,
      top10: null,
    }
    expect(mount(CheckCard, { props: { result } }).find('.bar').exists()).toBe(false)
  })

  it('tracks when an explanation is opened', async () => {
    const sink = createMemorySink()
    setAnalyticsSink(sink)
    const wrapper = mount(CheckCard, { props: { result: pause } })
    await wrapper.get('button').trigger('click')
    expect(sink.events).toEqual([{ event: 'explain_opened', props: { check: 'pause' } }])
  })

  it('tracks unknown results once, on display', () => {
    const sink = createMemorySink()
    setAnalyticsSink(sink)
    mount(CheckCard, { props: { result: unknown } })
    mount(CheckCard, { props: { result: pause } })
    expect(sink.events).toEqual([
      { event: 'check_unknown_shown', props: { check: 'mint' } },
    ])
  })
})
