import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('external archive: albums, cache, additions, deletion, and failed-sync preservation', async (t) => {
  await fs.mkdir(path.join(root, '.tmp'), { recursive: true })
  const sandbox = await fs.mkdtemp(path.join(root, '.tmp/archive-test-'))
  t.after(() => fs.rm(sandbox, { recursive: true, force: true }))
  const site = path.join(sandbox, 'site')
  const archive = path.join(sandbox, 'archive')
  const album = path.join(archive, 'pictures/games/test-game')
  await fs.mkdir(path.join(site, 'scripts'), { recursive: true })
  await fs.mkdir(album, { recursive: true })
  await fs.mkdir(path.join(archive, 'blogs/post'), { recursive: true })
  for (const filename of ['archive.mjs', 'sync-archive.mjs', 'media.mjs', 'cloudflare.mjs', 'release.mjs']) {
    await fs.copyFile(path.join(root, 'scripts', filename), path.join(site, 'scripts', filename))
  }
  await fs.symlink(path.join(root, 'node_modules'), path.join(site, 'node_modules'), 'dir')
  const pixels = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#456ba0' } }).png().toBuffer()
  await fs.writeFile(path.join(album, '02.png'), pixels)
  await fs.writeFile(path.join(album, '01 图.png'), pixels)
  await fs.writeFile(path.join(album, '.hidden.png'), pixels)
  await fs.writeFile(path.join(album, 'notes.txt'), 'not a picture')
  await fs.writeFile(path.join(archive, 'blogs/post/index.md'), '# A private source document')
  await fs.writeFile(path.join(archive, 'blogs/post/asset.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  await fs.symlink(path.join(archive, 'blogs/post/index.md'), path.join(album, 'linked.png'))

  function sync(source = archive) {
    return spawnSync(process.execPath, ['scripts/sync-archive.mjs'], {
      cwd: site,
      env: { ...process.env, FOLIO_ARCHIVE_PATH: source },
      encoding: 'utf8',
    })
  }
  async function manifest() {
    const source = await fs.readFile(path.join(site, '.folio/gallery.ts'), 'utf8')
    return JSON.parse(source.slice(source.indexOf(' = ') + 3))
  }

  let result = sync()
  assert.equal(result.status, 0, result.stderr)
  let albums = await manifest()
  assert.equal(albums.length, 1)
  assert.equal(albums[0].id, 'games/test-game')
  assert.equal(albums[0].title, 'games / test game')
  assert.deepEqual(albums[0].photos.map(photo => photo.id), ['games/test-game/01 图.png', 'games/test-game/02.png'])
  const photo = albums[0].photos[0]
  assert.equal(photo.width, 16)
  assert.equal(photo.height, 12)
  assert.match(photo.src, /01%20%E5%9B%BE\.png$/)
  assert.match(photo.backdrop, /^hsl\(/)
  assert.deepEqual(await fs.readFile(path.join(site, 'public/media/pictures/games/test-game/01 图.png')), pixels)
  assert.equal(await fs.readFile(path.join(site, 'public/media/blogs/post/asset.svg'), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  await assert.rejects(fs.stat(path.join(site, 'public/media/blogs/post/index.md')), { code: 'ENOENT' })
  await assert.rejects(fs.stat(path.join(site, 'public/media/pictures/games/test-game/linked.png')), { code: 'ENOENT' })

  const before = await fs.stat(path.join(site, '.folio/gallery.ts'))
  result = sync()
  assert.equal(result.status, 0, result.stderr)
  assert.equal((await fs.stat(path.join(site, '.folio/gallery.ts'))).mtimeMs, before.mtimeMs)

  await fs.unlink(path.join(album, '02.png'))
  await fs.writeFile(path.join(album, '03.png'), pixels)
  result = sync()
  assert.equal(result.status, 0, result.stderr)
  albums = await manifest()
  assert.deepEqual(albums[0].photos.map(photo => photo.id), ['games/test-game/01 图.png', 'games/test-game/03.png'])
  await assert.rejects(fs.stat(path.join(site, 'public/media/pictures/games/test-game/02.png')), { code: 'ENOENT' })

  const goodManifest = await fs.readFile(path.join(site, '.folio/gallery.ts'), 'utf8')
  await fs.writeFile(path.join(album, '00-broken.png'), 'incomplete upload')
  result = sync()
  assert.notEqual(result.status, 0)
  assert.equal(await fs.readFile(path.join(site, '.folio/gallery.ts'), 'utf8'), goodManifest)
  assert.deepEqual(await fs.readFile(path.join(site, 'public/media/pictures/games/test-game/03.png')), pixels)
  result = sync(path.join(sandbox, 'missing'))
  assert.notEqual(result.status, 0)
  assert.equal(await fs.readFile(path.join(site, '.folio/gallery.ts'), 'utf8'), goodManifest)

  result = sync('')
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(await manifest(), [])
})
