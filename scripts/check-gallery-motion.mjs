import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.env.CI) throw new Error('Run browser checks in CI')
const source = await fs.readFile('.folio/gallery.ts', 'utf8')
const album = JSON.parse(source.slice(source.indexOf(' = ') + 3)).find(item => item.photos.length >= 3)
if (!album) {
  console.log('Gallery motion checks skipped: no album with at least three photos')
  process.exit(0)
}
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2], 'node_modules/playwright/index.mjs')).href)
const root = path.resolve('out')
const screenshots = '.tmp/gallery-motion'
await fs.mkdir(screenshots, { recursive: true })
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let filename = path.resolve(root, `.${pathname}`)
    if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end()
      return
    }
    if ((await fs.stat(filename)).isDirectory()) filename = path.join(filename, 'index.html')
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream' })
    createReadStream(filename).on('error', () => response.destroy()).pipe(response)
  } catch {
    response.writeHead(404).end()
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const url = `http://127.0.0.1:${server.address().port}/#${new URLSearchParams({ album: album.id })}`
let browser
let page
const errors = []
try {
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--ozone-platform=x11'] })
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  page = await mobile.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.waitForFunction(() => [...document.querySelectorAll('[data-moving] > a')].some(frame => frame.style.transform.includes('rotateX(')))
  const cdp = await mobile.newCDPSession(page)
  const point = (y, id = 0, x = 195) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })
  const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  async function drag(from, to) {
    await touch('touchStart', [point(from)])
    for (let index = 1; index <= 10; index++) {
      await touch('touchMove', [point(from + (to - from) * index / 10)])
      await page.waitForTimeout(16)
    }
  }
  const state = () => page.locator('[data-moving]').evaluate(strip => ({
    photo: Number(strip.querySelector('[data-active="true"]').getAttribute('aria-label').match(/\d+/)[0]),
    reveal: Number(document.querySelector('[data-content-panel]').style.getPropertyValue('--paint-reveal')),
    frames: [...strip.querySelectorAll('[data-visible="true"]')].map(frame => {
      const transform = getComputedStyle(frame).transform
      const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform)
      return { scale: Math.hypot(matrix.m11, matrix.m12, matrix.m13), depth: matrix.m43, vertical: frame.style.transform.includes('rotateX(') }
    }),
  }))
  async function settled(photo) {
    await page.waitForFunction(() => {
      const strip = document.querySelector('[data-moving]')
      return strip?.dataset.settled === 'true' && strip.dataset.moving === 'false'
    })
    const result = await state()
    assert.equal(result.photo, photo)
    assert.equal(result.reveal, 0)
    assert.equal(result.frames.length, 1)
  }
  await settled(1)
  await drag(650, 450)
  await page.waitForTimeout(250)
  const preview = await state()
  assert(preview.reveal > 0.5, 'Touch movement must reveal the desktop panel treatment before release')
  assert(preview.frames.length > 1, 'Touch movement must show neighbouring photographs')
  assert(preview.frames.every(frame => frame.scale < 0.9 && frame.vertical))
  assert(preview.frames.some(frame => frame.depth < 0), 'Touch movement must preserve the desktop depth effect')
  await page.locator('[data-visible="true"] img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: `${screenshots}/mobile-drag.png` })
  await touch('touchEnd')
  await settled(2)
  await page.screenshot({ path: `${screenshots}/mobile-settled.png` })

  await drag(450, 650)
  await touch('touchEnd')
  await settled(1)
  await drag(650, 620)
  await touch('touchEnd')
  await settled(1)
  await drag(650, 450)
  await touch('touchCancel')
  await settled(1)

  await drag(650, 450)
  await touch('touchStart', [point(450), point(480, 1, 225)])
  await touch('touchEnd')
  await settled(1)

  await drag(650, 450)
  await touch('touchEnd')
  await page.waitForTimeout(40)
  await drag(450, 650)
  await touch('touchEnd')
  await settled(1)

  await drag(650, 450)
  await touch('touchEnd')
  await drag(650, 590)
  await touch('touchCancel')
  await settled(2)
  await drag(450, 650)
  await touch('touchEnd')
  await settled(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await drag(650, 450)
  assert.equal((await state()).photo, 1, 'Reduced motion waits for release instead of animating the drag')
  assert.equal((await state()).reveal, 0)
  await touch('touchEnd')
  await settled(2)
  await mobile.close()

  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.waitForFunction(() => [...document.querySelectorAll('[data-moving] > a')].some(frame => frame.style.transform.includes('rotateY(')))
  await settled(1)
  await page.locator('[data-moving]').hover()
  for (let index = 0; index < 6; index++) await page.mouse.wheel(0, 120)
  await page.waitForFunction(() => Number(document.querySelector('[data-content-panel]').style.getPropertyValue('--paint-reveal')) > 0.5)
  const desktop = await state()
  assert(desktop.frames.length > 1 && desktop.frames.every(frame => !frame.vertical))
  await page.locator('[data-visible="true"] img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: `${screenshots}/desktop-reveal.png` })
  await settled(1)
  await page.locator('[data-moving] [data-active="true"]').focus()
  await page.keyboard.press('ArrowRight')
  await settled(2)
  assert.deepEqual(errors, [])
  console.log('Gallery browser checks passed: touch preview, release, reversal, short swipe, cancel, multi-touch, interruption, reduced motion, desktop wheel and keyboard')
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${screenshots}/failure.png` }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
