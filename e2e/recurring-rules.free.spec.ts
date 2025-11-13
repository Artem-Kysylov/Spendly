import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL
const PASSWORD = process.env.TEST_USER_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'Provide TEST_USER_EMAIL and TEST_USER_PASSWORD in env')

test('Free: Add button disabled after creating two recurring rules', async ({ page }) => {
  await page.goto('/en')

  await page.getByPlaceholder('Email').fill(EMAIL!)
  await page.getByPlaceholder('Password').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.goto('/en/user-settings')
  await expect(page.getByRole('heading', { name: 'Recurring Rules' })).toBeVisible()

  await page.getByPlaceholder('Title pattern').fill('Test Rule A')
  await page.getByPlaceholder('Average amount').fill('5')
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('Test Rule A')).toBeVisible()

  await page.getByPlaceholder('Title pattern').fill('Test Rule B')
  await page.getByPlaceholder('Average amount').fill('10')
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('Test Rule B')).toBeVisible()

  const addBtn = page.getByRole('button', { name: 'Add rule' })
  await expect(addBtn).toBeDisabled()

  // Текст ошибки лимита (локаль en)
  await expect(page.getByText('In Free plan, you can add up to 2 recurring rules. Upgrade to Pro for unlimited.')).toBeVisible()
})