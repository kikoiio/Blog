import { managedObject, retentionLeaseKey, retentionStateKey } from './storage-keys.mjs'

const leaseDuration = 60 * 60 * 1000
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })

async function leaseRecord(bucket) {
  const object = await bucket.get(retentionLeaseKey)
  if (!object) return null
  const value = await object.json()
  if (!value || typeof value.owner !== 'string' || !Number.isSafeInteger(value.expires) || value.expires < 0) throw new Error('Invalid storage lease record')
  return { object, value }
}

export async function maintenance(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  if (path === '/maintenance/lease' && request.method === 'POST') {
    const { owner, mode } = await request.json()
    if (typeof owner !== 'string' || !/^[a-f0-9-]{36}$/.test(owner) || !['acquire', 'renew', 'release'].includes(mode)) return json({ error: 'Invalid lease' }, 400)
    const current = await leaseRecord(env.SOURCES)
    const now = Date.now()
    // An expired holder may still have a delayed request. Never steal its lock.
    // Interrupted jobs fail closed until their owner releases or an operator recovers it.
    if (mode === 'acquire' ? current && current.value.expires !== 0 && current.value.owner !== owner
      : !current || current.value.owner !== owner || (mode === 'renew' && current.value.expires <= now)) return json({ error: 'Storage is busy or the lease expired; an interrupted job may require lock recovery' }, 409)
    try {
      const saved = await env.SOURCES.put(retentionLeaseKey, JSON.stringify({ owner, expires: mode === 'release' ? 0 : now + leaseDuration }), {
        onlyIf: current ? { etagMatches: current.object.etag } : new Headers({ 'If-None-Match': '*' }),
        httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
      })
      return saved ? json({ success: true }) : json({ error: 'Storage lease changed' }, 409)
    } catch (error) {
      if (String(error).includes('412') || String(error).includes('precondition')) return json({ error: 'Storage lease changed' }, 409)
      throw error
    }
  }

  const lease = await leaseRecord(env.SOURCES)
  if (!lease || lease.value.owner !== request.headers.get('X-Folio-Lease') || lease.value.expires <= Date.now()) return json({ error: 'A valid storage lease is required' }, 409)
  if (path === '/maintenance/state') {
    if (request.method === 'GET') {
      const object = await env.SOURCES.get(retentionStateKey)
      return json(object ? await object.json() : null)
    }
    if (request.method === 'PUT') {
      const body = await request.text()
      if (body.length > 2_000_000) return json({ error: 'Retention ledger too large' }, 413)
      JSON.parse(body)
      await env.SOURCES.put(retentionStateKey, body, { httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' } })
      return json({ success: true })
    }
  }
  const kind = url.searchParams.get('bucket')
  const bucket = kind === 'source' ? env.SOURCES : kind === 'media' ? env.MEDIA : null
  if (!bucket) return json({ error: 'Invalid bucket' }, 400)
  if (path === '/maintenance/inventory' && request.method === 'GET') {
    const prefix = url.searchParams.get('prefix')
    if (!(kind === 'source' ? ['sources/', 'releases/'] : ['images/', 'metadata/']).includes(prefix)) return json({ error: 'Invalid prefix' }, 400)
    const page = await bucket.list({ prefix, limit: 500, cursor: url.searchParams.get('cursor') || undefined })
    return json({ objects: page.objects.map(({ key, size, uploaded }) => ({ key, size, uploaded })), truncated: page.truncated, cursor: page.cursor })
  }
  if (path === '/maintenance/object' && request.method === 'DELETE') {
    const key = url.searchParams.get('key') || ''
    if (!managedObject(kind, key)) return json({ error: 'Unmanaged object' }, 400)
    await bucket.delete(key)
    return json({ success: true })
  }
  return json({ error: 'Not found' }, 404)
}
