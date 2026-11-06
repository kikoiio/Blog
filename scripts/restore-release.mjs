import fs from 'node:fs/promises'
import path from 'node:path'
import { cloudflareClient, required } from './cloudflare.mjs'
import { hashFile, validateRelease } from './release.mjs'

const client = cloudflareClient()
const bucket = required('FOLIO_SOURCE_BUCKET')
const revision = process.env.FOLIO_RELEASE_REVISION || 'latest'
if (revision !== 'latest' && !/^[a-f0-9]{64}$/.test(revision)) throw new Error('Invalid release revision')
const release = validateRelease(await client.getJSON(bucket, `releases/${revision}.json`))
const destination = path.resolve(required('FOLIO_ARCHIVE_PATH'))
for (const directory of ['blogs', 'pictures']) await fs.mkdir(path.join(destination, directory), { recursive: true })
for (const entry of release.files) {
  const target = path.join(destination, entry.path)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await client.getFile(bucket, entry.objectKey, `${target}.download`)
  if (await hashFile(`${target}.download`) !== entry.sha256) throw new Error(`Download checksum mismatch: ${entry.path}`)
  await fs.rename(`${target}.download`, target)
}
await fs.writeFile(path.join(destination, 'release.json'), `${JSON.stringify(release, null, 2)}\n`)
console.log(`Restored release ${release.revision}: ${release.files.length} files`)
