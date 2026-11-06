import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.env.CI) throw new Error('Browser verification runs only in cloud CI')
const { chromium } = await import(pathToFileURL(path.join(process.argv[2], 'node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
async function verify() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.FOLIO_SITE_URL, { waitUntil: 'networkidle' })
  if (await page.getByRole('img').count() === 0) {
    assert(await page.getByText('还没有图片作品').isVisible())
    console.log('Empty archive page verified.')
    return
  }
  async function decodedImage() {
    await page.waitForFunction(() => {
      const image = document.querySelector('img')
      return image?.complete && image.naturalWidth > 0 && image.currentSrc === image.src
    })
    await page.getByRole('img').evaluate(async image => {
      await image.decode()
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
  }
  await decodedImage()
  const first = await page.getByRole('img').getAttribute('src')
  const count = Number((await page.locator('[aria-live="polite"]').textContent()).split('/')[1])
  if (count > 1) {
    await page.getByRole('button', { name: '下一张图片' }).click()
    await page.waitForFunction(src => document.querySelector('img')?.getAttribute('src') !== src, first)
    await decodedImage()
    await page.getByRole('button', { name: '上一张图片' }).click()
    await page.waitForFunction(src => document.querySelector('img')?.getAttribute('src') === src, first)
    await decodedImage()
  }
  const albums = page.getByRole('combobox', { name: '选择相册' })
  if (await albums.count()) {
    const title = await albums.locator('option').nth(1).textContent()
    await albums.selectOption({ index: 1 })
    await page.waitForFunction(title => document.querySelector('img')?.alt.startsWith(title), title)
    await decodedImage()
    assert((await page.locator('[aria-live="polite"]').textContent()).trim().startsWith('1 /'))
  }
  await page.screenshot({ path: path.join(process.env.RUNNER_TEMP, 'folio-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile layout overflows')
  assert(await page.getByRole('button', { name: '下一张图片' }).isVisible())
  const mobileCount = Number((await page.locator('[aria-live="polite"]').textContent()).split('/')[1])
  if (mobileCount > 1) {
    const previous = await page.getByRole('img').getAttribute('src')
    await page.getByRole('button', { name: '下一张图片' }).click()
    await page.waitForFunction(src => document.querySelector('img')?.getAttribute('src') !== src, previous)
    await decodedImage()
  }
  await page.screenshot({ path: path.join(process.env.RUNNER_TEMP, 'folio-mobile.png') })
  assert.deepEqual(errors, [], 'Browser raised JavaScript errors')
  console.log('Live browser checks passed: decoded images, next/previous, album selection, desktop and mobile layout.')
}
try {
  await verify()
} finally {
  await browser.close()
}
