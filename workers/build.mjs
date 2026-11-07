import { serveObject } from './media.mjs'
import { maintenance } from './maintenance.mjs'

const buildWorker = {
  async fetch(request, env) {
    if (!env.BUILD_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.BUILD_TOKEN}`) {
      return new Response('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }
    if (new URL(request.url).pathname.startsWith('/maintenance/')) return maintenance(request, env)
    const match = new URL(request.url).pathname.match(/^\/r2\/buckets\/([^/]+)\/objects\/(.+)$/)
    if (!match) return new Response('Not found', { status: 404 })
    const bucketName = decodeURIComponent(match[1])
    const key = match[2].split('/').map(decodeURIComponent).join('/')
    const source = bucketName === env.SOURCE_BUCKET
    const media = bucketName === env.MEDIA_BUCKET
    const sourceKey = /^sources\/[a-f0-9]{64}$/.test(key) || /^releases\/(latest|[a-f0-9]{64})\.json$/.test(key)
    const mediaKey = /^images\/(?:v1\/[a-f0-9]{64}\/(?:2400|640)|v2\/[a-f0-9]{64}\/(?:2400|1600|640))\.webp$/.test(key) || /^metadata\/v[12]\/[a-f0-9]{64}\.json$/.test(key)
    if ((!source || !sourceKey) && (!media || !mediaKey)) return new Response('Not found', { status: 404 })
    const bucket = source ? env.SOURCES : env.MEDIA
    if (['GET', 'HEAD'].includes(request.method)) {
      const response = await serveObject(request, bucket, key)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'private, no-store')
      headers.delete('Access-Control-Allow-Origin')
      return new Response(response.body, { status: response.status, headers })
    }
    if (request.method === 'PUT' && media && mediaKey) {
      await bucket.put(key, request.body, {
        httpMetadata: { contentType: key.endsWith('.webp') ? 'image/webp' : 'application/json', cacheControl: 'public, max-age=31536000, immutable' },
      })
      return Response.json({ success: true })
    }
    return new Response('Method not allowed', { status: 405 })
  },
}

export default buildWorker
