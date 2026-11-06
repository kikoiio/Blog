import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRelease, revisionFor, validateRelease, validArchivePath } from '../scripts/release.mjs'
import mediaWorker from '../workers/media.mjs'
import buildWorker from '../workers/build.mjs'

test('release snapshots exclude hidden files/symlinks and detect modified content', async t => {
  await fs.mkdir('.tmp', { recursive: true })
  const root = await fs.mkdtemp(path.resolve('.tmp/release-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'blogs'), { recursive: true })
  await fs.mkdir(path.join(root, 'pictures/game'), { recursive: true })
  await fs.writeFile(path.join(root, 'blogs/post.md'), '# My post')
  await fs.writeFile(path.join(root, 'pictures/game/01 图.png'), 'fixture pixels')
  await fs.writeFile(path.join(root, 'pictures/game/.secret.png'), 'private')
  await fs.writeFile(path.join(root, 'pictures/game/notes.txt'), 'not a picture')
  await fs.symlink(path.join(root, 'blogs/post.md'), path.join(root, 'pictures/game/linked.png'))
  const before = await createRelease(root)
  assert.equal(before.files.length, 2)
  assert.equal(validateRelease(before), before)
  assert.equal((await createRelease(root)).revision, before.revision)
  await fs.writeFile(path.join(root, 'pictures/game/01 图.png'), 'new fixture pixels')
  const after = await createRelease(root)
  assert.notEqual(after.revision, before.revision)
  assert.notEqual(after.files[1].objectKey, before.files[1].objectKey)
  assert.throws(() => validateRelease({ ...after, revision: before.revision }))
  const duplicate = [...after.files, after.files[0]]
  assert.throws(() => validateRelease({ ...after, files: duplicate, revision: revisionFor(duplicate) }))
  for (const name of ['pictures/../secret.png', '/pictures/a.png', 'pictures/.private/a.png', 'pictures/a\\b.png', 'blogs/private.pem']) {
    assert.equal(validArchivePath(name), false, name)
  }
  assert.equal(validArchivePath('pictures/games/01 图.PNG'), true)
})

test('public and build Workers reject unauthorized routes before touching storage', async () => {
  const hash = 'a'.repeat(64)
  assert.equal((await mediaWorker.fetch(new Request(`https://media.test/sources/${hash}`), {})).status, 404)
  assert.equal((await mediaWorker.fetch(new Request(`https://media.test/images/v1/${hash}/2400.webp`, { method: 'PUT' }), {})).status, 405)
  const url = `https://build.test/r2/buckets/source/objects/sources/${hash}`
  assert.equal((await buildWorker.fetch(new Request(url), { BUILD_TOKEN: 'private' })).status, 401)
  assert.equal((await buildWorker.fetch(new Request(url, { method: 'PUT', headers: { Authorization: 'Bearer private' } }), { BUILD_TOKEN: 'private', SOURCE_BUCKET: 'source', MEDIA_BUCKET: 'media' })).status, 405)
})
