import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { archiveRoot, projectRoot } from './archive.mjs'
import { createRelease } from './release.mjs'
import { cloudflareClient, required } from './cloudflare.mjs'
import { publishRelease } from './publish-release.mjs'
import { readSite } from './site-config.mjs'
import { storageMaintenanceClient, withStorageLease } from './storage-maintenance.mjs'

if (!archiveRoot) throw new Error('Set FOLIO_ARCHIVE_PATH before publishing')
await readSite(archiveRoot)
const release = await createRelease(archiveRoot)
await fs.mkdir(path.join(projectRoot, '.folio'), { recursive: true })
const manifest = path.join(projectRoot, '.folio/release.json')
await fs.writeFile(manifest, `${JSON.stringify(release, null, 2)}\n`)
console.log(`Prepared ${release.files.length} files, revision ${release.revision}`)
if (process.argv.includes('--prepare')) process.exit(0)

const sourceBucket = required('FOLIO_SOURCE_BUCKET')
const website = required('FOLIO_WEBSITE_REPOSITORY')
if (!/^[\w.-]+\/[\w.-]+$/.test(website)) throw new Error('Invalid GitHub website repository configuration')
await fs.mkdir(path.join(projectRoot, '.tmp'), { recursive: true })
const temporary = await fs.mkdtemp(path.join(projectRoot, '.tmp/publish-'))
const immutableManifest = path.join(temporary, 'release.json')
await fs.writeFile(immutableManifest, JSON.stringify(release))
let uploaded
try {
  uploaded = await withStorageLease(await storageMaintenanceClient(), lease => publishRelease({
    archiveRoot, release, manifest: immutableManifest, sourceBucket, client: cloudflareClient(),
    checkLease: lease.renew,
    requestBuild(revision) {
      execFileSync('gh', ['variable', 'set', 'FOLIO_PUBLISH_ENABLED', '--repo', website, '--body', 'true'], { stdio: ['ignore', 'pipe', 'pipe'] })
      execFileSync('gh', ['workflow', 'run', 'deploy.yml', '--repo', website, '-f', `revision=${revision}`], { stdio: 'inherit' })
    },
  }))
} finally {
  await fs.rm(temporary, { recursive: true, force: true })
}
console.log(`Publishing requested: ${release.files.length} files (${uploaded} new uploads). Follow the run with: gh run list --repo ${website}`)
