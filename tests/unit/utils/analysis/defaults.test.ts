import { describe, expect, it } from 'vitest'
import { createDefaultDeps } from '~/utils/analysis/defaults'

describe('createDefaultDeps', () => {
  it('wires the public explorer and RPC clients', () => {
    const deps = createDefaultDeps()
    expect(deps.explorer).toHaveProperty('getHolders')
    expect(deps.chain).toHaveProperty('readContract')
  })
})
