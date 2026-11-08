import type { CheckResult, UpgradeSignals } from '~/types/analysis'
import { combineSignals } from './abi'

const EMPTY_SLOT = /^0x0*$/

export function detectUpgradeable(signals: UpgradeSignals): CheckResult<'upgradeable'> {
  const { implementationSlot, explorerIsProxy } = signals
  const slotSet =
    implementationSlot === null ? null : !EMPTY_SLOT.test(implementationSlot)

  const evidence: string[] = []
  if (slotSet) evidence.push('EIP-1967 implementation slot is set')
  if (explorerIsProxy) evidence.push('Explorer reports a proxy contract')

  return {
    id: 'upgradeable',
    status: combineSignals([slotSet, explorerIsProxy]),
    evidence,
  }
}
