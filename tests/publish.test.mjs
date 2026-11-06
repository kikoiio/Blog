import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRelease } from '../scripts/release.mjs'
import { publishRelease } from '../scripts/publish-release.mjs'

async function fixture(t) {
  await fs.mkdir('.tmp', { recursive: true })
  const root = await fs.mkdtemp(path.resolve('.tmp/publish-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const archiveRoot = path.join(root, 'archive')
  await fs.mkdir(path.join(archiveRoot, 'blogs'), { recursive: true })
  await fs.mkdir(path.join(archiveRoot, 'pictures'), { recursive: true })
  await fs.writeFile(path.join(archiveRoot, 'blogs/post.md'), '# A post')
  await fs.writeFile(path.join(archiveRoot, 'pictures/01.png'), 'picture fixture')
  const release = await createRelease(archiveRoot)
  const manifest = path.join(root, 'release.json')
  await fs.writeFile(manifest, JSON.stringify(release))
  return { archiveRoot, release, manifest, sourceBucket: 'private-originals', report() {} }
}

test('publishing works with a plain folder, retains archive files, and skips uploaded originals', async t => {
  const options = await fixture(t)
  const legacyManifest = path.join(options.archiveRoot, 'release.json')
  await fs.writeFile(legacyManifest, 'Legacy local file: leave untouched')
  const objects = new Map()
  const writes = []
  const client = {
    async exists(bucket, key, size) {
      assert.equal(bucket, options.sourceBucket)
      return objects.get(key)?.length === size
    },
    async putFile(bucket, key, filename) {
      assert.equal(bucket, options.sourceBucket)
      objects.set(key, await fs.readFile(filename))
      writes.push(key)
    },
  }
  let builds = 0
  const requestBuild = revision => {
    assert.equal(revision, options.release.revision)
    assert.deepEqual(JSON.parse(objects.get('releases/latest.json')), options.release)
    assert.deepEqual(JSON.parse(objects.get(`releases/${revision}.json`)), options.release)
    builds++
  }
  assert.equal(await publishRelease({ ...options, client, requestBuild }), 2)
  assert.equal(await publishRelease({ ...options, client, requestBuild }), 0)
  assert.equal(builds, 2)
  assert.equal(writes.filter(key => key.startsWith('sources/')).length, 2)
  assert.equal(await fs.readFile(legacyManifest, 'utf8'), 'Legacy local file: leave untouched')
  assert.deepEqual((await fs.readdir(options.archiveRoot)).sort(), ['blogs', 'pictures', 'release.json'])
  await assert.rejects(fs.stat(path.join(options.archiveRoot, '.git')), { code: 'ENOENT' })
})

test('an archive modified during upload does not replace the current release or request a build', async t => {
  const options = await fixture(t)
  const writes = []
  const client = {
    async exists() { return false },
    async putFile(_bucket, key) {
      writes.push(key)
      await fs.writeFile(path.join(options.archiveRoot, 'blogs/post.md'), '# Edited during publishing')
    },
  }
  await assert.rejects(publishRelease({
    ...options, client,
    requestBuild() { assert.fail('Must not build a changed snapshot') },
  }), /Archive changed during upload/)
  assert(writes.every(key => key.startsWith('sources/')))
})
