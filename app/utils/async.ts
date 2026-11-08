/** Resolves to the value, or to `undefined` when the promise rejects. */
export async function attempt<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise
  } catch {
    return undefined
  }
}
