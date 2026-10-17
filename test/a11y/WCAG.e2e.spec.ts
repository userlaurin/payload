import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ensureCompilationIsDone } from '../__helpers/e2e/helpers.js'
import { runAxeScan } from '../__helpers/e2e/runAxeScan.js'
import { initPayloadE2ENoConfig } from '../__helpers/shared/initPayloadE2ENoConfig.js'
import { devUser } from '../credentials.js'
import { TEST_TIMEOUT_LONG } from '../playwright.config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
let serverURL: string

const getAdminHeaders = async ({ page }: { page: Page }) => {
  const response = await page.request.post(`${serverURL}/api/users/login`, {
    data: { email: devUser.email, password: devUser.password },
  })
  expect(response.status()).toBe(200)
  const { token } = await response.json()
  return { Authorization: `JWT ${token}` }
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(TEST_TIMEOUT_LONG * 3)
  ;({ serverURL } = await initPayloadE2ENoConfig({ dirname }))
  const page = await browser.newPage()
  await ensureCompilationIsDone({ page, serverURL })
  await page.close()
})

test.describe('WCAG 3.3.2 Labels or Instructions (A)', () => {
  test('should render client and server slug labels and preserve the default and hidden-label behavior', async ({
    page,
  }) => {
    await page.goto(`${serverURL}/admin/collections/posts/create`)
    await expect(page.getByTestId('custom-label-customSlug')).toBeVisible()
    await expect(page.getByTestId('server-label-serverSlug')).toHaveAttribute('data-language', 'en')
    await expect(
      page
        .locator('.slug-field-component')
        .filter({ has: page.locator('#field-slug') })
        .locator('label'),
    ).toHaveText('Slug')
    await expect(
      page
        .locator('.slug-field-component')
        .filter({ has: page.locator('#field-hiddenSlug') })
        .locator('label'),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Unlock', exact: true }).nth(1).click()
    const authoredSlug = `authored-slug-${Date.now()}`
    await page.locator('#field-customSlug').fill(authoredSlug)
    await expect(page.locator('#field-customSlug')).toHaveValue(authoredSlug)
    await page.locator('#field-title').fill(`Hook regression ${authoredSlug}`)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).not.toHaveURL(/\/create$/)
    const documentID = new URL(page.url()).pathname.split('/').at(-1)
    try {
      await page.reload()
      await expect(page.locator('#field-customSlug')).toHaveValue(authoredSlug)
    } finally {
      const cleanup = await page.request.delete(`${serverURL}/api/posts/${documentID}`, {
        headers: await getAdminHeaders({ page }),
      })
      expect(cleanup.status()).toBe(200)
    }
  })

  test('should honor email and username labels and retain password labels across cancellation and reopening', async ({
    page,
  }) => {
    await page.goto(`${serverURL}/admin/account`)
    await expect(page.getByTestId('server-label-email')).toBeVisible()
    await expect(page.getByTestId('custom-label-username')).toBeVisible()
    await page.getByRole('button', { name: 'Change Password', exact: true }).click()
    await expect(page.getByTestId('server-label-password')).toHaveAttribute('data-language', 'en')
    await expect(page.getByTestId('custom-label-confirm-password')).toBeVisible()
    await page.locator('#field-password').fill('cancelled-password')
    await page.locator('#field-confirm-password').fill('cancelled-password')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.locator('#field-password')).toHaveCount(0)
    await page.getByRole('button', { name: 'Change Password', exact: true }).click()
    await expect(page.getByTestId('server-label-password')).toBeVisible()
    await expect(page.getByTestId('custom-label-confirm-password')).toBeVisible()
    await expect(page.locator('#field-password')).toHaveValue('')
    await expect(page.locator('#field-confirm-password')).toHaveValue('')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.reload()
    await page.getByRole('button', { name: 'Change Password', exact: true }).click()
    await expect(page.getByTestId('server-label-password')).toBeVisible()
  })

  test('should supply custom labels on creation and keep required validation and label focus working', async ({
    page,
  }, testInfo) => {
    await page.goto(`${serverURL}/admin/collections/users/create`)
    await expect(page.getByTestId('server-label-password')).toBeVisible()
    await expect(page.getByTestId('custom-label-confirm-password')).toBeVisible()
    const scan = await runAxeScan({
      include: ['.auth-fields'],
      page,
      screenshotViolations: false,
      testInfo,
    })
    expect(scan.violations).toEqual([])
    await testInfo.attach('custom-auth-labels', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
    await page.getByTestId('custom-label-confirm-password').locator('label').click()
    await expect(page.locator('#field-confirm-password')).toBeFocused()
    await page.locator('#field-email').fill('label-validation@example.com')
    await page.locator('#field-password').fill('test-password')
    await page.locator('#field-confirm-password').fill('mismatch')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.confirm-password .field-error')).toBeVisible()
    await expect(page).toHaveURL(/\/create$/)
  })
  test('should resolve custom labels in the selected admin language', async ({ context, page }) => {
    await context.addCookies([{ name: 'payload-lng', url: serverURL, value: 'de' }])
    await page.goto(`${serverURL}/admin/collections/users/create`)
    await expect(page.getByTestId('server-label-password')).toHaveAttribute('data-language', 'de')
    await expect(page.getByTestId('custom-label-confirm-password').locator('label')).toContainText(
      'Passwort',
    )
    await page.goto(`${serverURL}/admin/collections/posts/create`)
    await expect(page.getByTestId('custom-label-customSlug').locator('label')).toHaveText(
      'customSlug Beschriftung',
    )
  })

  test('should discard cancelled passwords when saving other account fields', async ({ page }) => {
    await page.goto(`${serverURL}/admin/account`)
    await page.getByRole('button', { name: 'Change Password', exact: true }).click()
    await page.locator('#field-password').fill('must-never-be-saved')
    await page.locator('#field-confirm-password').fill('must-never-be-saved')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    const previousUsername = await page.locator('#field-username').inputValue()
    await page.locator('#field-username').fill(`label-admin-${Date.now()}`)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Change Password', exact: true })).toBeVisible()
    const response = await page.request.post(`${serverURL}/api/users/login`, {
      data: { email: devUser.email, password: devUser.password },
    })
    expect(response.status()).toBe(200)
    const { token, user } = await response.json()
    const cleanup = await page.request.patch(`${serverURL}/api/users/${user.id}`, {
      data: { username: previousUsername },
      headers: { Authorization: `JWT ${token}` },
    })
    expect(cleanup.status()).toBe(200)
  })
  test('should save a user with matching passwords and keep native authentication working', async ({
    page,
  }) => {
    const email = `label-user-${Date.now()}@example.com`
    const password = 'matching-label-password'
    await page.goto(`${serverURL}/admin/collections/users/create`)
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('#field-confirm-password').fill(password)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).not.toHaveURL(/\/create$/)
    const documentID = new URL(page.url()).pathname.split('/').at(-1)
    try {
      await page.reload()
      await expect(page.getByTestId('server-label-email')).toBeVisible()
      const response = await page.request.post(`${serverURL}/api/users/login`, {
        data: { email, password },
      })
      expect(response.status()).toBe(200)
    } finally {
      const cleanup = await page.request.delete(`${serverURL}/api/users/${documentID}`, {
        headers: await getAdminHeaders({ page }),
      })
      expect(cleanup.status()).toBe(200)
    }
  })
})
