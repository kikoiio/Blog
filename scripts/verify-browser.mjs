import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.env.CI) throw new Error('Browser verification runs only in cloud CI')
const { chromium } = await import(pathToFileURL(path.join(process.argv[2], 'node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.FOLIO_SITE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('img').waitFor()
  await page.waitForFunction(() => document.querySelector('img')?.naturalWidth > 0)
  const first = await page.getByRole('img').getAttribute('src')
  await page.getByRole('button', { name: '下一张图片' }).click()
  await page.waitForFunction(src => document.querySelector('img')?.getAttribute('src') !== src, first)
  await page.waitForFunction(() => document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0)
  await page.getByRole('button', { name: '上一张图片' }).click()
  await page.waitForFunction(src => document.querySelector('img')?.getAttribute('src') === src, first)
  const albums = page.getByRole('combobox', { name: '选择相册' })
  if (await albums.count()) {
    await albums.selectOption({ index: 1 })
    await page.waitForFunction(() => document.querySelector('[aria-live="polite"]')?.textContent?.trim().startsWith('1 /'))
    await page.waitForFunction(() => document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0)
  }
  await page.screenshot({ path: path.join(process.env.RUNNER_TEMP, 'folio-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile layout overflows')
  assert(await page.getByRole('button', { name: '下一张图片' }).isVisible())
  await page.getByRole('button', { name: '下一张图片' }).click()
  await page.waitForFunction(() => document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth > 0)
  await page.screenshot({ path: path.join(process.env.RUNNER_TEMP, 'folio-mobile.png') })
  assert.deepEqual(errors, [], 'Browser raised JavaScript errors')
  console.log('Live browser checks passed: image loading, next/previous, album selection, desktop and mobile layout.')
} finally {
  await browser.close()
}
