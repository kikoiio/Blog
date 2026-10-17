import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('scratch/visual-lab/output');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--ozone-platform=x11'] });
const report = { browser: browser.version(), captures: [] };
async function capture(name, url, { mobile = false, reference = false, dark = false } = {}) {
    const folder = path.join(output, name);
    await mkdir(folder, { recursive: true });
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile,
        hasTouch: mobile, colorScheme: dark ? 'dark' : 'light', recordVideo: { dir: folder, size: viewport } });
    const page = await context.newPage();
    const result = { name, url, errors: [], console: [], requests: [] };
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.console.push(message.text()); });
    page.on('requestfailed', request => result.requests.push({ url: request.url(), error: request.failure()?.errorText }));
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(reference ? 16000 : 1200);
        await page.screenshot({ path: path.join(folder, '00-idle.png') });
        result.page = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 6000),
            canvases: [...document.querySelectorAll('canvas')].map(c => ({ width: c.width, height: c.height })) }));
        const cx = viewport.width * .55, cy = viewport.height * .46;
        if (!reference && !mobile) await page.getByRole('button', { name: '触碰水面' }).click();
        else { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.up(); }
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(folder, '01-click.png') });
        await page.waitForTimeout(180);
        await page.screenshot({ path: path.join(folder, '02-click-later.png') });
        await page.waitForTimeout(1400);
        await page.mouse.move(viewport.width * .15, viewport.height * .5);
        for (let i = 0; i <= 36; i++) {
            await page.mouse.move(viewport.width * (.15 + i / 36 * .65), viewport.height * (.50 + Math.sin(i / 36 * Math.PI * 2) * .12));
            if ([12, 24, 36].includes(i)) await page.screenshot({ path: path.join(folder, `03-hover-${i}.png`) });
            await page.waitForTimeout(16);
        }
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(folder, '04-settled.png') });
        if (!reference) {
            await page.locator('#reading').scrollIntoViewIfNeeded();
            await page.waitForTimeout(1400);
            await page.screenshot({ path: path.join(folder, '05-reading.png') });
            result.status = await page.locator('#engine-status').textContent();
            result.debug = await page.evaluate(() => window.__zimaDebug?.() ?? null);
        }
        await writeFile(path.join(folder, 'page.json'), JSON.stringify(result, null, 2));
    } catch (error) {
        result.failure = String(error);
        await page.screenshot({ path: path.join(folder, 'failure.png') }).catch(() => {});
    } finally {
        await context.close();
        report.captures.push(result);
        await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    }
}
await capture('prototype-light', 'http://127.0.0.1:4173');
await capture('prototype-dark', 'http://127.0.0.1:4173', { dark: true });
await capture('prototype-mobile', 'http://127.0.0.1:4173', { mobile: true });
if (process.env.CAPTURE_REFERENCES === 'true') {
    await capture('reference-lusion', 'https://lusion.co/', { reference: true });
    await capture('reference-ogl-fluid', 'https://oframe.github.io/ogl/examples/post-fluid-distortion.html', { reference: true });
    await capture('reference-ogl-flowmap', 'https://oframe.github.io/ogl/examples/mouse-flowmap.html', { reference: true });
    await capture('reference-evan-water', 'https://madebyevan.com/webgl-water/', { reference: true });
    await capture('reference-active-theory', 'https://activetheory.net/', { reference: true });
}
await browser.close();
if (report.captures.some(c => !c.name.startsWith('reference-') && (c.failure || c.errors.length))) process.exitCode = 1;
