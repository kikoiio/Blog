import test from 'node:test'
import assert from 'node:assert/strict'
import { allowPhotoPrefetch, createPhotoCache } from '../lib/gallery-photo-cache.ts'
import mediaWorker from '../workers/media.mjs'

function photograph(id) {
  return { id, src: `/${id}/2400.webp`, width: 2400, height: 1600 }
}

function fixture() {
  const images = []
  const pending = []
  const cache = createPhotoCache(() => {
    const image = {
      src: '', decoding: '', fetchPriority: '',
      decode: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    }
    images.push(image)
    return image
  })
  return { cache, images, pending }
}

test('a selected photo reuses an in-flight neighbour preload and raises its priority', async () => {
  const { cache, images, pending } = fixture()
  const photo = photograph('one')
  const preload = cache.decode(photo, photo, 'low')
  assert.equal(images[0].fetchPriority, 'low')
  assert.equal(cache.decode(photo, photo), preload)
  assert.equal(images.length, 1)
  assert.equal(images[0].fetchPriority, 'high')
  assert.equal(cache.recalled(photo), undefined)
  pending[0].resolve()
  assert.equal(await preload, true)
  assert.equal(cache.recalled(photo).src, photo.src)
  assert.equal(await cache.decode(photo, photo), true)
  assert.equal(images.length, 1)
})

test('revisiting keeps the loaded full-size URL even after its decoded pixels are evicted', async () => {
  const { cache, images, pending } = fixture()
  const first = photograph('one')
  for (const id of ['one', 'two', 'three', 'four']) {
    const photo = photograph(id)
    const load = cache.decode(photo, photo)
    pending.at(-1).resolve()
    assert.equal(await load, true)
  }
  assert.equal(images[0].src, '')
  assert.equal(images.filter(image => image.src).length, 3)
  assert.equal(cache.recalled(first).src, first.src)
  cache.remember(first, { src: '/one/640.webp', width: 640, height: 427 })
  assert.equal(cache.recalled(first).src, first.src, 'A preview cannot downgrade the remembered source')
})

test('failed and evicted requests cannot be recalled as decoded and may be retried', async () => {
  const { cache, pending } = fixture()
  const photo = photograph('one')
  const failed = cache.decode(photo, photo)
  pending[0].reject(new Error('offline'))
  assert.equal(await failed, false)
  assert.equal(cache.recalled(photo), undefined)
  const loads = ['one', 'two', 'three', 'four'].map(id => {
    const item = photograph(id)
    return cache.decode(item, item)
  })
  pending[1].resolve()
  assert.equal(await loads[0], false)
  assert.equal(cache.recalled(photo), undefined)
  for (let index = 2; index < pending.length; index++) pending[index].resolve()
  await Promise.all(loads)
})

test('URL history stays bounded without retaining an entire album of decoded images', () => {
  const { cache, images } = fixture()
  for (let index = 0; index < 65; index++) {
    const photo = photograph(String(index))
    cache.remember(photo, photo)
  }
  assert.equal(cache.recalled(photograph('0')), undefined)
  assert.equal(cache.recalled(photograph('64')).src, '/64/2400.webp')
  assert.equal(images.length, 0)
})

test('speculative downloads respect data saver and slow connections', () => {
  assert.equal(allowPhotoPrefetch(undefined), true)
  assert.equal(allowPhotoPrefetch({ effectiveType: '4g' }), true)
  assert.equal(allowPhotoPrefetch({ saveData: true, effectiveType: '4g' }), false)
  assert.equal(allowPhotoPrefetch({ effectiveType: '2g' }), false)
  assert.equal(allowPhotoPrefetch({ effectiveType: 'slow-2g' }), false)
})

test('ordinary R2 requests stay complete and cacheable; explicit ranges and conditional requests still work', async () => {
  const url = `https://media.example/images/v2/${'a'.repeat(64)}/1600.webp`
  const reads = []
  const object = () => ({
    size: 4, range: { offset: 0, length: 4 }, httpEtag: '"photo"', body: 'webp',
    writeHttpMetadata(headers) { headers.set('Content-Type', 'image/webp') },
  })
  const bucket = { async get(_key, options) { reads.push(options); return object() }, async head() { return object() } }
  for (const method of ['GET', 'HEAD']) {
    const response = await mediaWorker.fetch(new Request(url, { method }), { MEDIA: bucket })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Range'), null)
    assert.equal(response.headers.get('Content-Length'), '4')
    assert.match(response.headers.get('Cache-Control'), /max-age=31536000, immutable/)
    assert.equal(await response.text(), method === 'GET' ? 'webp' : '')
  }
  assert.deepEqual(reads, [undefined])
  const partial = await mediaWorker.fetch(new Request(url, { headers: { Range: 'bytes=0-3' } }), { MEDIA: bucket })
  assert.equal(partial.status, 206)
  assert.equal(partial.headers.get('Content-Range'), 'bytes 0-3/4')
  const unchanged = await mediaWorker.fetch(new Request(url, { headers: { 'If-None-Match': '"photo"' } }), { MEDIA: bucket })
  assert.equal(unchanged.status, 304)
})
