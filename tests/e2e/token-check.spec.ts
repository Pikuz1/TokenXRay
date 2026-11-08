import { expect, test } from '@playwright/test'
import { TOKEN, blockDataSources, mockDataSources } from './support/mock-network'

test.describe('checking a token', () => {
  test('a sample token shows every check and the data confidence line', async ({
    page,
  }) => {
    await mockDataSources(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'USDC' }).click()

    await expect(page.getByRole('heading', { name: /Mock Dollar/ })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(7)
    await expect(page.getByText('Issuer can pause all transfers')).toBeVisible()
    await expect(page.getByText('Issuer can block specific wallets')).toBeVisible()
    await expect(page.getByText('Controlled by one wallet')).toBeVisible()
    await expect(page.getByText('Top 10 wallets hold 40.0%')).toBeVisible()
    await expect(page.getByText('7 of 7 checks completed')).toBeVisible()
    await expect(page.getByText('Sample data')).toHaveCount(0)
  })

  test('a typed address works the same way', async ({ page }) => {
    await mockDataSources(page)
    await page.goto('/')

    await page.getByLabel('Token contract address').fill(TOKEN)
    await page.getByRole('button', { name: 'Check token' }).click()

    await expect(page.getByRole('article')).toHaveCount(7)
  })

  test('an invalid address gets a friendly error', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Token contract address').fill('hello')
    await page.getByRole('button', { name: 'Check token' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'does not look like an Ethereum address',
    )
    await expect(page.getByRole('article')).toHaveCount(0)
  })

  test('falls back to saved sample data when the network is blocked', async ({
    page,
  }) => {
    await blockDataSources(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'USDC' }).click()

    await expect(page.getByText('Sample data', { exact: true })).toBeVisible()
    await expect(page.getByText(/Live data could not be loaded/)).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(7)
  })

  test('opens a plain explanation for a check', async ({ page }) => {
    await mockDataSources(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'USDC' }).click()

    const card = page
      .getByRole('article')
      .filter({ hasText: 'Can the issuer pause all transfers?' })
    await card.getByRole('button', { name: 'Why it matters' }).click()

    await expect(card.getByText(/bank freezing every account/)).toBeVisible()
  })
})

test.describe('printed report', () => {
  test('hides the controls and expands the explanations', async ({ page }) => {
    await mockDataSources(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'USDC' }).click()
    await expect(page.getByText('7 of 7 checks completed')).toBeVisible()

    await page.emulateMedia({ media: 'print' })

    await expect(page.getByLabel('Token contract address')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden()
    await expect(page.getByText(/bank freezing every account/)).toBeVisible()
    await expect(page.getByText(TOKEN)).toBeVisible()
  })
})
