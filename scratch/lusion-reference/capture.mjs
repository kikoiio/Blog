import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const target = 'https://lusion.co/';
const output = path.resolve(process.env.CAPTURE_OUTPUT ?? 'evidence');
const report = {
  target,
  startedAt: new Date().toISOString(),
  purpose: 'Record reference behavior; visual review is still required.',
  performanceLimit: 'Software WebGL and recorded video do not measure device GPU performance.',
  sessions: [],
};
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--ozone-platform=x11', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
  { name: 'touch', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' },
  { name: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
].filter(profile => !process.env.CAPTURE_PROFILES || process.env.CAPTURE_PROFILES.split(',').includes(profile.name));
report.browserVersion = browser.version();

async function capture(profile) {
  const directory = path.join(output, profile.name);
  await mkdir(directory, { recursive: true });
  const session = { profile, status: 'capturing', events: [], images: [], errors: [] };
  report.sessions.push(session);
  const start = performance.now();
  const log = (type, data = {}) => session.events.push({ ms: Math.round(performance.now() - start), type, ...data });
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 0.5,
    isMobile: profile.isMobile ?? false,
    hasTouch: profile.hasTouch ?? false,
    reducedMotion: profile.reducedMotion,
    recordVideo: { dir: directory, size: { width: Math.round(profile.viewport.width / 2), height: Math.round(profile.viewport.height / 2) } },
  });
  let page;
  let screenshotClient;
  const checkpoint = async (name) => {
    const file = `${name}.png`;
    // The first run timed out inside Playwright's screenshot/paint synchronization.
    // Capture the compositor surface directly without freezing the reference animation.
    let timer;
    try {
      const screenshot = await Promise.race([
        screenshotClient.send('Page.captureScreenshot', {
          format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Compositor screenshot exceeded 30 seconds')), 30000); }),
      ]);
      await writeFile(path.join(directory, file), Buffer.from(screenshot.data, 'base64'));
    } finally {
      clearTimeout(timer);
    }
    const state = await page.evaluate(() => ({
      url: location.href,
      scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      activeElement: document.activeElement?.tagName,
    }));
    session.images.push({ file, ms: Math.round(performance.now() - start), ...state });
    log('checkpoint', { name, ...state });
  };
  const move = async (x, y, duration = 700) => {
    const next = { x: Math.round(x * profile.viewport.width), y: Math.round(y * profile.viewport.height) };
    const previous = session.pointer ?? next;
    log('pointer-move-start', { normalized: { x, y }, pixels: next, requestedDurationMs: duration });
    const count = Math.max(1, Math.ceil(duration / 20));
    for (let index = 1; index <= count; index++) {
      const progress = index / count;
      const px = previous.x + (next.x - previous.x) * progress;
      const py = previous.y + (next.y - previous.y) * progress;
      await page.mouse.move(px, py);
      log('pointer-sample', { x: px, y: py });
      if (index < count) await page.waitForTimeout(duration / count);
    }
    session.pointer = next;
    log('pointer-move-end');
  };
  const settle = async (prefix) => {
    // Save actual timestamps: screenshot encoding can extend the intended intervals.
    const stopped = performance.now();
    for (const ms of [0, 350, 1000]) {
      const remaining = ms - (performance.now() - stopped);
      if (remaining > 0) await page.waitForTimeout(remaining);
      await checkpoint(`${prefix}-${String(ms).padStart(4, '0')}ms`);
    }
  };
  try {
    await context.addInitScript(() => {
      window.__referenceContexts = [];
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        const result = Reflect.apply(getContext, this, [type, ...args]);
        if (result && /^(webgl2?|experimental-webgl)$/.test(type)) {
          const debug = result.getExtension('WEBGL_debug_renderer_info');
          window.__referenceContexts.push({
            canvas: this.id,
            type,
            version: result.getParameter(result.VERSION),
            renderer: debug ? result.getParameter(debug.UNMASKED_RENDERER_WEBGL) : result.getParameter(result.RENDERER),
          });
        }
        return result;
      };
    });
    page = await context.newPage();
    screenshotClient = await context.newCDPSession(page);
    page.on('pageerror', error => {
      if (session.errors.length < 100) session.errors.push({ type: 'pageerror', message: error.message });
    });
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type()) && session.errors.length < 100) {
        session.errors.push({ type: message.type(), message: message.text().slice(0, 1500) });
      }
    });
    page.on('requestfailed', request => {
      if (session.errors.length >= 100) return;
      const url = new URL(request.url());
      session.errors.push({ type: 'requestfailed', url: `${url.origin}${url.pathname}`.slice(0, 1500), failure: request.failure() });
    });
    log('navigation-start', { target });
    const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    session.httpStatus = response?.status();
    if (!response?.ok()) throw new Error(`Reference returned HTTP ${session.httpStatus}`);
    // Wait for visible canvas sizing and allow the site's asset loading/intro to run.
    await page.waitForFunction(() => [...document.querySelectorAll('canvas')].some(canvas => {
      const rect = canvas.getBoundingClientRect();
      return canvas.width > 0 && canvas.height > 0 && rect.width > 0 && rect.height > 0;
    }), undefined, { timeout: 30000 });
    await page.waitForTimeout(20000);
    session.environment = await page.evaluate(() => ({
      title: document.title,
      userAgent: navigator.userAgent,
      dpr: devicePixelRatio,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      contexts: window.__referenceContexts,
      canvases: [...document.querySelectorAll('canvas')].map(canvas => ({
        id: canvas.id, width: canvas.width, height: canvas.height,
        rect: canvas.getBoundingClientRect().toJSON(),
      })),
    }));
    await checkpoint('01-loaded-pending-review');
    if (!session.environment.contexts.length) throw new Error('No WebGL context observed; capture is not a valid 3D reference.');
    // Do not start the pointer path while the loader/intro still covers the controls.
    await page.waitForFunction(() => {
      let element = document.querySelector('#header-right-menu-btn');
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.left < 0 || rect.right > innerWidth || rect.bottom < 0 || rect.top > innerHeight) return false;
      while (element && element !== document.documentElement) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.9) return false;
        element = element.parentElement;
      }
      return true;
    }, undefined, { timeout: 120000 });
    await page.waitForTimeout(3000);
    await checkpoint('02-idle');

    if (profile.hasTouch) {
      const cdp = await context.newCDPSession(page);
      log('touch-scroll-start', { from: { x: 0.5, y: 0.8 }, to: { x: 0.5, y: 0.25 } });
      for (let index = 0; index <= 16; index++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: index === 0 ? 'touchStart' : 'touchMove',
          touchPoints: [{ x: profile.viewport.width * 0.5, y: profile.viewport.height * (0.8 - 0.55 * index / 16) }],
        });
        await page.waitForTimeout(25);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      log('touch-scroll-end');
      await settle('03-touch-scroll');
      await cdp.detach();
    } else {
      await move(0.2, 0.5, 0);
      await move(0.8, 0.5, 1200);
      await checkpoint('03-slow-horizontal');
      await move(0.8, 0.25, 700);
      await move(0.8, 0.75, 1000);
      await checkpoint('04-slow-vertical');
      await move(0.2, 0.4, 120);
      await move(0.8, 0.6, 120);
      await settle('05-fast-reverse-stop');
      log('pointer-leave');
      await page.mouse.move(-10, -10);
      session.pointer = { x: -10, y: -10 };
      await settle('06-pointer-leave');

      const point = await page.evaluate(() => {
        for (const [x, y] of [[0.72, 0.55], [0.5, 0.62], [0.28, 0.56]]) {
          const element = document.elementFromPoint(innerWidth * x, innerHeight * y);
          if (element && !element.closest('a,button,input,textarea,select,[role="button"],video')) {
            return { x, y, hitTag: element.tagName, hitId: element.id };
          }
        }
        return null;
      });
      if (point) {
        log('scene-click', point);
        await page.mouse.click(point.x * profile.viewport.width, point.y * profile.viewport.height);
        await settle('07-scene-click');
        if (page.url() !== target) throw new Error('Scene click changed the URL; inspect evidence before continuing.');
      } else {
        log('scene-click-skipped', { reason: 'No non-control point found in the selected scene area.' });
      }
    }

    // Selector verified in the public homepage HTML on 2026-10-17.
    const menu = page.locator('#header-right-menu-btn');
    if (await menu.isVisible()) {
      if (!profile.hasTouch) {
        log('menu-hover');
        await menu.hover();
        await page.waitForTimeout(600);
        await checkpoint('08-menu-hover');
      }
      log('menu-open');
      if (profile.hasTouch) await menu.tap(); else await menu.click();
      await settle('09-menu-open');
      log('menu-close');
      if (profile.hasTouch) await menu.tap(); else await menu.click();
      await settle('10-menu-close');
      log('menu-rapid-toggle');
      if (profile.hasTouch) await menu.tap(); else await menu.click();
      await page.waitForTimeout(100);
      if (profile.hasTouch) await menu.tap(); else await menu.click();
      await settle('11-menu-reverse');
    } else {
      log('menu-skipped', { reason: 'Known menu selector not visible; inspect reference version.' });
    }

    if (!profile.hasTouch) {
      await move(0.5, 0.7, 400);
      for (let index = 0; index < 5; index++) {
        log('wheel', { deltaY: 240 });
        await page.mouse.wheel(0, 240);
        await page.waitForTimeout(180);
        await checkpoint(`12-scroll-down-${index + 1}`);
      }
      await settle('13-scroll-stop');
      for (let index = 0; index < 5; index++) {
        log('wheel', { deltaY: -240 });
        await page.mouse.wheel(0, -240);
        await page.waitForTimeout(180);
      }
      await settle('14-scroll-reverse');
    }
    session.status = 'captured-awaiting-visual-review';
  } catch (error) {
    session.status = 'failed';
    session.failure = error.stack ?? String(error);
    if (page && !page.isClosed()) {
      await checkpoint('failure').catch(() => {});
    }
  } finally {
    // Closing the context finalizes its video before the artifact is uploaded.
    const video = page?.video();
    await context.close();
    if (video) session.video = path.relative(output, await video.path());
    await writeFile(path.join(directory, 'session.json'), JSON.stringify(session, null, 2));
    console.log(`${profile.name}: ${session.status}`);
  }
}

try {
  // One browser, one active context at a time.
  for (const profile of profiles) await capture(profile);
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
if (report.sessions.some(session => session.status === 'failed')) process.exitCode = 1;
