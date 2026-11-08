import { createAbiDetector } from './abi'

export const detectMint = createAbiDetector('mint', [
  'mint',
  'minter',
  'minters',
  'mintable',
])
