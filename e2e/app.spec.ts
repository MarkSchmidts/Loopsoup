import { test, expect } from '@playwright/test'

test.describe('Loopsoup App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the app with logo', async ({ page }) => {
    await expect(page.locator('.logo')).toHaveText('loopsoup')
  })

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/loopsoup/)
  })

  test('renders the visualizer canvas', async ({ page }) => {
    const canvas = page.locator('canvas.visualizer')
    await expect(canvas).toBeVisible()
  })

  test('renders the controls bar', async ({ page }) => {
    const controls = page.locator('.controls')
    await expect(controls).toBeVisible()
  })

  test('has a track selector dropdown', async ({ page }) => {
    const select = page.locator('.track-selector')
    await expect(select).toBeVisible()
  })

  test('has a volume slider', async ({ page }) => {
    const slider = page.locator('.volume-slider')
    await expect(slider).toBeVisible()
  })

  test('shows download and delete buttons on hover', async ({ page }) => {
    const app = page.locator('.looper-app')
    await app.hover()
    const downloadBtn = page.locator('button[aria-label="Download"]')
    const deleteBtn = page.locator('button[aria-label="Delete"]')
    await expect(downloadBtn).toBeVisible()
    await expect(deleteBtn).toBeVisible()
  })

  test('clicking visualizer requests mic permission', async ({ page, context }) => {
    // Grant mic permission
    await context.grantPermissions(['microphone'])
    const canvas = page.locator('.visualizer-container')
    await canvas.click()
    // After clicking, recording state should change (no error thrown)
    await page.waitForTimeout(500)
  })

  test('mute button toggles', async ({ page }) => {
    const muteBtn = page.locator('button[aria-label="Toggle mute"]')
    await expect(muteBtn).toBeVisible()
    await expect(muteBtn).toHaveAttribute('title', 'Mute')
    await muteBtn.click()
    await expect(muteBtn).toHaveAttribute('title', 'Unmute')
  })
})
