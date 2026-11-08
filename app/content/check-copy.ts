import type { CheckId } from '~/types/analysis'

export interface CheckCopy {
  question: string
  whyItMatters: string
}

export const CHECK_COPY: Readonly<Record<CheckId, CheckCopy>> = {
  verified: {
    question: 'Is the code public and verified?',
    whyItMatters:
      'When the code is verified, anyone can check that the published rules match what is actually running.',
  },
  upgradeable: {
    question: 'Can the rules be changed later?',
    whyItMatters:
      'Many contracts are upgradeable, which means the rulebook can be rewritten after you hold the token.',
  },
  pause: {
    question: 'Can the issuer pause all transfers?',
    whyItMatters:
      'Like a bank freezing every account at once. It can protect holders in an emergency, and it also stops everyone from moving funds.',
  },
  freeze: {
    question: 'Can specific wallets be blocked or frozen?',
    whyItMatters:
      'Like a bank freezing one customer’s account. It is often required by regulation, but it is a real power over individual holders.',
  },
  mint: {
    question: 'Can new tokens be created?',
    whyItMatters:
      'If a key can create more tokens, the share held by existing holders can shrink. Many regulated issuers need this to issue new units.',
  },
  admin: {
    question: 'Who holds the admin key?',
    whyItMatters:
      'One wallet is a single point of failure. A multi-signature wallet needs several people to agree before anything happens.',
  },
  concentration: {
    question: 'How concentrated is ownership?',
    whyItMatters:
      'If a few wallets hold most of the supply, one decision can move the market.',
  },
}
