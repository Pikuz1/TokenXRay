import type { AdminResult, AnyCheckResult, ConcentrationResult } from '~/types/analysis'

export type Tone = 'ok' | 'attention' | 'neutral'

export interface Presentation {
  tone: Tone
  /** Short label so the state never depends on colour alone. */
  badge: string
  headline: string
  detail: string | null
}

type Variant = Omit<Presentation, 'detail'>

const UNKNOWN: Presentation = {
  tone: 'neutral',
  badge: 'Unknown',
  headline: 'Could not be checked',
  detail: 'The public data needed to answer this was not available.',
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

const functionsDetail = (evidence: string[]) =>
  evidence.length > 0 ? `Functions found: ${evidence.join(', ')}` : null

const sentencesDetail = (evidence: string[]) =>
  evidence.length > 0 ? `${evidence.join('. ')}.` : null

function binary(
  result: AnyCheckResult,
  yes: Variant,
  no: Variant,
  detail: (evidence: string[]) => string | null,
): Presentation {
  if (result.status === 'unknown') return UNKNOWN
  return { ...(result.status === 'yes' ? yes : no), detail: detail(result.evidence) }
}

function presentAdmin(result: AdminResult): Presentation {
  switch (result.control) {
    case 'multisig':
      return {
        tone: 'ok',
        badge: 'Multi-signature',
        headline: `Multi-signature: ${result.threshold} of ${result.signers} must approve`,
        detail:
          'Actions need several people to agree, so no single wallet can act alone.',
      }
    case 'single-wallet':
      return {
        tone: 'attention',
        badge: 'One wallet',
        headline: 'Controlled by one wallet',
        detail: 'One key holds this power, with no second approval step.',
      }
    case 'contract':
      return {
        tone: 'neutral',
        badge: 'Contract',
        headline: 'Controlled by a contract',
        detail:
          'It is not a Safe-style multi-signature wallet, so its approval rules could not be read.',
      }
    case 'none':
      return {
        tone: 'neutral',
        badge: 'No owner found',
        headline: 'No single owner function found',
        detail: 'Access may be managed another way, for example through roles.',
      }
    case 'unknown':
      return result.status === 'yes'
        ? {
            tone: 'neutral',
            badge: 'Owner found',
            headline: 'An owner exists, but its type could not be determined',
            detail: null,
          }
        : UNKNOWN
  }
}

function presentConcentration(result: ConcentrationResult): Presentation {
  const { level, top1, top10 } = result
  if (level === 'unknown' || top1 === null || top10 === null) return UNKNOWN

  const badges = { low: 'Low', medium: 'Medium', high: 'High' } as const
  return {
    tone: level === 'low' ? 'ok' : 'attention',
    badge: badges[level],
    headline: `Top 10 wallets hold ${formatPercent(top10)}`,
    detail: `The largest wallet holds ${formatPercent(top1)}. Exchanges and contracts can be among the largest holders.`,
  }
}

/** Turns a raw check result into the wording and tone shown on its card. */
export function presentCheck(result: AnyCheckResult): Presentation {
  switch (result.id) {
    case 'verified':
      return binary(
        result,
        { tone: 'ok', badge: 'Verified', headline: 'Code is public and verified' },
        { tone: 'attention', badge: 'Not verified', headline: 'Code is not verified' },
        sentencesDetail,
      )
    case 'upgradeable':
      return binary(
        result,
        {
          tone: 'attention',
          badge: 'Upgradeable',
          headline: 'Rules can be changed later',
        },
        { tone: 'ok', badge: 'Fixed', headline: 'No upgrade mechanism found' },
        sentencesDetail,
      )
    case 'pause':
      return binary(
        result,
        {
          tone: 'attention',
          badge: 'Can pause',
          headline: 'Issuer can pause all transfers',
        },
        { tone: 'ok', badge: 'None found', headline: 'No pause function found' },
        functionsDetail,
      )
    case 'freeze':
      return binary(
        result,
        {
          tone: 'attention',
          badge: 'Can block',
          headline: 'Issuer can block specific wallets',
        },
        {
          tone: 'ok',
          badge: 'None found',
          headline: 'No wallet-blocking function found',
        },
        functionsDetail,
      )
    case 'mint':
      return binary(
        result,
        { tone: 'attention', badge: 'Can mint', headline: 'New tokens can be created' },
        { tone: 'ok', badge: 'None found', headline: 'No minting function found' },
        functionsDetail,
      )
    case 'admin':
      return presentAdmin(result)
    case 'concentration':
      return presentConcentration(result)
  }
}
