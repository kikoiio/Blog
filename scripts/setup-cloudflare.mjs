import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { projectRoot } from './archive.mjs'
import { cloudflareClient, required } from './cloudflare.mjs'

const source = required('FOLIO_SOURCE_BUCKET')
const media = required('FOLIO_MEDIA_BUCKET')
if (source === media) throw new Error('Originals and public media require separate buckets')
const repository = required('FOLIO_WEBSITE_REPOSITORY')
const mediaWorker = process.env.FOLIO_MEDIA_WORKER || 'folio-media'
const buildWorker = process.env.FOLIO_BUILD_WORKER || 'folio-build'
for (const name of [source, media, mediaWorker, buildWorker]) {
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(name)) throw new Error('Invalid Cloudflare resource name')
}
function github(args, input) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return execFileSync('gh', args, { input, stdio: ['pipe', 'pipe', 'pipe'] }) } catch (error) {
      if (attempt === 2) throw new Error(`GitHub configuration failed for ${args[2]}: ${String(error.stderr).slice(0, 400)}`)
    }
  }
}
const client = cloudflareClient()
for (const name of [source, media]) {
  const existing = await client.request(`r2/buckets/${name}`, { allowMissing: true })
  if (existing) await existing.body?.cancel()
  else {
    await client.request('r2/buckets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: () => JSON.stringify({ name, storageClass: 'Standard' }) })
  }
  const verified = await (await client.request(`r2/buckets/${name}`)).json()
  if (!verified.success) throw new Error(`Cannot verify bucket ${name}`)
  console.log(`R2 bucket ready: ${name}`)
}
const subdomain = (await (await client.request('workers/subdomain')).json()).result.subdomain
await fs.mkdir(path.join(projectRoot, '.folio'), { recursive: true })
const tokenFile = path.join(projectRoot, '.folio/storage-token')
let storageToken
try { storageToken = await fs.readFile(tokenFile, 'utf8') } catch (error) {
  if (error.code !== 'ENOENT') throw error
  storageToken = randomBytes(32).toString('hex')
  await fs.writeFile(tokenFile, storageToken, { mode: 0o600 })
}
async function deployWorker(name, main, bindings) {
  const form = new FormData()
  form.set('metadata', new Blob([JSON.stringify({ main_module: main, compatibility_date: '2026-11-01', bindings })], { type: 'application/json' }))
  for (const filename of main === 'build.mjs' ? ['build.mjs', 'media.mjs'] : ['media.mjs']) {
    form.set(filename, new Blob([await fs.readFile(path.join(projectRoot, 'workers', filename))], { type: 'application/javascript+module' }), filename)
  }
  const result = await (await client.request(`workers/scripts/${name}`, { method: 'PUT', body: () => form })).json()
  if (!result.success) throw new Error(`Worker upload failed: ${name}`)
  await client.request(`workers/scripts/${name}/subdomain`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: () => JSON.stringify({ enabled: true, previews_enabled: false }),
  })
  console.log(`Worker ready: https://${name}.${subdomain}.workers.dev`)
}
await deployWorker(mediaWorker, 'media.mjs', [{ type: 'r2_bucket', name: 'MEDIA', bucket_name: media }])
await deployWorker(buildWorker, 'build.mjs', [
  { type: 'r2_bucket', name: 'MEDIA', bucket_name: media },
  { type: 'r2_bucket', name: 'SOURCES', bucket_name: source },
  { type: 'plain_text', name: 'MEDIA_BUCKET', text: media },
  { type: 'plain_text', name: 'SOURCE_BUCKET', text: source },
  { type: 'secret_text', name: 'BUILD_TOKEN', text: storageToken },
])
const variables = {
  FOLIO_SOURCE_BUCKET: source,
  FOLIO_MEDIA_BUCKET: media,
  FOLIO_MEDIA_BASE_URL: `https://${mediaWorker}.${subdomain}.workers.dev`,
  FOLIO_BUILD_URL: `https://${buildWorker}.${subdomain}.workers.dev`,
  FOLIO_SITE_TITLE: process.env.FOLIO_SITE_TITLE || 'Folio',
  FOLIO_SITE_URL: required('FOLIO_SITE_URL'),
  CLOUDFLARE_PAGES_PROJECT: required('CLOUDFLARE_PAGES_PROJECT'),
}
for (const [name, value] of Object.entries(variables)) {
  github(['variable', 'set', name, '--repo', repository, '--body', value])
}
github(['secret', 'set', 'FOLIO_STORAGE_TOKEN', '--repo', repository], storageToken)
await fs.writeFile(path.join(projectRoot, '.folio/cloudflare-setup.json'), `${JSON.stringify(variables, null, 2)}\n`)
console.log('Cloudflare resources and scoped GitHub build access configured; publishing is still disabled until the first release is uploaded.')
