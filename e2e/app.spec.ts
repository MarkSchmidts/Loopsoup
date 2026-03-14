import { test, expect } from '@playwright/test'

test.describe('Loopsoup App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the app with logo image', async ({ page }) => {
    const logo = page.locator('img.loopsoup-logo')
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('src', '/logo.png')
  })

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/loopsoup/)
  })

  test('renders the visualizer canvas', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })

  test('canvas fills the viewport', async ({ page }) => {
    const visu = page.locator('.visu')
    await expect(visu).toBeVisible()
    const box = await visu.boundingBox()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)
  })

  test('renders the bottom controls bar', async ({ page }) => {
    const controls = page.locator('.controls')
    await expect(controls).toBeVisible()
  })

  test('has a track selector dropdown', async ({ page }) => {
    const select = page.locator('.controls select')
    await expect(select).toBeVisible()
  })

  test('has a volume slider', async ({ page }) => {
    const slider = page.locator('.volume-slider')
    await expect(slider).toBeVisible()
  })

  test('has download and delete buttons in controls', async ({ page }) => {
    const downloadBtn = page.locator('button[aria-label="Download"]')
    const deleteBtn = page.locator('button[aria-label="Delete"]')
    await expect(downloadBtn).toBeVisible()
    await expect(deleteBtn).toBeVisible()
  })

  test('mute button toggles', async ({ page }) => {
    const muteBtn = page.locator('button[aria-label="Toggle mute"]')
    await expect(muteBtn).toBeVisible()
    await expect(muteBtn).toHaveAttribute('title', 'Mute')
    await muteBtn.click()
    await expect(muteBtn).toHaveAttribute('title', 'Unmute')
  })
})
