export type DataErrorKind = 'timeout' | 'network' | 'http' | 'parse'

export class DataError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'DataError'
  }
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface FetchOptions {
  fetcher?: Fetcher
  timeoutMs?: number
}

export const DEFAULT_TIMEOUT_MS = 8000

/** GETs a URL and returns parsed JSON, mapping every failure to a `DataError`. */
export async function fetchJson(
  url: string,
  {
    fetcher = (input, init) => fetch(input, init),
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: FetchOptions = {},
): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    throw new DataError(timedOut ? 'timeout' : 'network', `Request to ${url} failed`)
  }

  if (!response.ok) {
    throw new DataError(
      'http',
      `Request to ${url} returned ${response.status}`,
      response.status,
    )
  }

  try {
    return await response.json()
  } catch {
    throw new DataError('parse', `Response from ${url} was not valid JSON`)
  }
}
