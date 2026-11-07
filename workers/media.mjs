export async function serveObject(request, bucket, key) {
  const object = request.method === 'HEAD' ? await bucket.head(key) : await bucket.get(key, { range: request.headers })
  if (!object) return new Response('Not found', { status: 404 })
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  if (request.headers.get('If-None-Match') === object.httpEtag) return new Response(null, { status: 304, headers })
  let status = 200
  if (object.range) {
    const offset = object.range.offset ?? Math.max(0, object.size - object.range.suffix)
    const length = object.range.length ?? object.range.suffix
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    headers.set('Content-Length', String(length))
    status = 206
  } else headers.set('Content-Length', String(object.size))
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
}

const mediaWorker = {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 })
    const key = new URL(request.url).pathname.slice(1)
    if (!/^images\/(?:v1\/[a-f0-9]{64}\/(?:2400|640)|v2\/[a-f0-9]{64}\/(?:2400|1600|640))\.webp$/.test(key)) return new Response('Not found', { status: 404 })
    return serveObject(request, env.MEDIA, key)
  },
}

export default mediaWorker
