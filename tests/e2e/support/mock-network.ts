import type { Page, Route } from '@playwright/test'
import { POWERFUL_TOKEN_ABI } from '../../../fixtures/abis'

export const TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const OWNER = '0x1111111111111111111111111111111111111111'

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

const holders = [
  { address: { hash: OWNER }, value: '300' },
  { address: { hash: '0x3333333333333333333333333333333333333333' }, value: '100' },
]

function rpcResult({ method }: { method: string }): string {
  switch (method) {
    case 'eth_getStorageAt':
      return `0x${'0'.repeat(64)}`
    case 'eth_getCode':
      return '0x'
    default:
      // eth_call: owner() -> a regular wallet
      return `0x${'0'.repeat(24)}${OWNER.slice(2)}`
  }
}

/** Serves deterministic explorer and RPC responses so end-to-end runs need no network. */
export async function mockDataSources(page: Page) {
  await page.route('**/eth.blockscout.com/api/v2/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/holders')) return json(route, { items: holders })
    if (path.includes('/smart-contracts/')) {
      return json(route, {
        is_verified: true,
        abi: POWERFUL_TOKEN_ABI,
        implementations: [],
      })
    }
    return json(route, {
      name: 'Mock Dollar',
      symbol: 'MCK',
      decimals: '6',
      total_supply: '1000',
      holders_count: '2',
    })
  })

  await page.route('**/ethereum-rpc.publicnode.com/**', (route) => {
    const body = route.request().postDataJSON() as
      | { id: number; method: string }[]
      | {
          id: number
          method: string
        }
    const respond = (request: { id: number; method: string }) => ({
      jsonrpc: '2.0',
      id: request.id,
      result: rpcResult(request),
    })
    return json(route, Array.isArray(body) ? body.map(respond) : respond(body))
  })
}

/** Makes every data source unreachable, as when the visitor is offline. */
export async function blockDataSources(page: Page) {
  await page.route(/blockscout\.com|publicnode\.com/, (route) =>
    route.abort('internetdisconnected'),
  )
}
