import type { AdminProbe, AdminResult } from '~/types/analysis'

export function detectAdmin(probe: AdminProbe): AdminResult {
  if (probe.kind === 'unknown') {
    return { id: 'admin', status: 'unknown', evidence: [], control: 'unknown' }
  }
  if (probe.kind === 'none') {
    return { id: 'admin', status: 'no', evidence: [], control: 'none' }
  }

  const { address, isContract, multisig } = probe
  if (multisig) {
    return {
      id: 'admin',
      status: 'yes',
      evidence: [
        `Safe-style owner with threshold ${multisig.threshold} of ${multisig.signers}`,
      ],
      control: 'multisig',
      address,
      threshold: multisig.threshold,
      signers: multisig.signers,
    }
  }
  if (isContract === null) {
    return {
      id: 'admin',
      status: 'yes',
      evidence: ['owner() returns an address'],
      control: 'unknown',
      address,
    }
  }
  return {
    id: 'admin',
    status: 'yes',
    evidence: [isContract ? 'owner() is a contract' : 'owner() is a regular wallet'],
    control: isContract ? 'contract' : 'single-wallet',
    address,
  }
}
