import { createAbiDetector } from './abi'

export const detectFreeze = createAbiDetector('freeze', [
  'blacklist',
  'blacklisted',
  'blocklist',
  'blocklisted',
  'denylist',
  'denylisted',
  'freeze',
  'unfreeze',
  'frozen',
  'ban',
  'unban',
  'banned',
])
