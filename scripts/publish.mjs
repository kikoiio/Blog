import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { archiveRoot, projectRoot } from './archive.mjs'
import { createRelease } from './release.mjs'
import { cloudflareClient, required } from './cloudflare.mjs'

if (!archiveRoot) throw new Error('Set FOLIO_ARCHIVE_PATH before publishing')
const release = await createRelease(archiveRoot)
await fs.mkdir(path.join(projectRoot, '.folio'), { recursive: true })
const manifest = path.join(projectRoot, '.folio/release.json')
await fs.writeFile(manifest, `${JSON.stringify(release, null, 2)}\n`)
console.log(`Prepared ${release.files.length} files, revision ${release.revision}`)
if (process.argv.includes('--prepare')) process.exit(0)

const sourceBucket = required('FOLIO_SOURCE_BUCKET')
const website = required('FOLIO_WEBSITE_REPOSITORY')
const archiveRepository = required('FOLIO_ARCHIVE_REPOSITORY')
for (const repository of [website, archiveRepository]) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid GitHub repository configuration')
}
const git = (...args) => execFileSync('git', ['-C', archiveRoot, ...args], { encoding: 'utf8' }).trim()
const remote = git('remote', 'get-url', 'origin')
if (!remote.endsWith(`github.com/${archiveRepository}.git`) && !remote.endsWith(`github.com:${archiveRepository}.git`)) {
  throw new Error('Archive Git origin does not match FOLIO_ARCHIVE_REPOSITORY')
}
const trackedSources = git('ls-files', 'blogs', 'pictures')
if (trackedSources) throw new Error('Raw archive files must be excluded from Git before publishing')
const staged = git('diff', '--cached', '--name-only')
if (staged && staged.split('\n').some(name => name !== 'release.json')) {
  throw new Error('Commit or unstage your other changes before publishing')
}
const client = cloudflareClient()
let uploaded = 0
for (const entry of release.files) {
  if (!await client.exists(sourceBucket, entry.objectKey, entry.size)) {
    await client.putFile(sourceBucket, entry.objectKey, path.join(archiveRoot, entry.path))
    uploaded++
  }
  console.log(`Source ready: ${entry.path}`)
}
if ((await createRelease(archiveRoot)).revision !== release.revision) throw new Error('Archive changed during upload; run publish again after editing finishes')
await client.putFile(sourceBucket, `releases/${release.revision}.json`, manifest, 'application/json')
await fs.copyFile(manifest, path.join(archiveRoot, 'release.json'))
git('add', '--', 'release.json')
if (git('diff', '--cached', '--name-only')) git('commit', '-m', `Publish archive ${release.revision.slice(0, 12)}`)
const branch = git('branch', '--show-current')
git('push', '-u', 'origin', branch)
await client.putFile(sourceBucket, 'releases/latest.json', manifest, 'application/json')
execFileSync('gh', ['variable', 'set', 'FOLIO_PUBLISH_ENABLED', '--repo', website, '--body', 'true'], { stdio: ['ignore', 'pipe', 'pipe'] })
execFileSync('gh', ['workflow', 'run', 'deploy.yml', '--repo', website, '-f', `revision=${release.revision}`], { stdio: 'inherit' })
console.log(`Publishing requested: ${release.files.length} files (${uploaded} new uploads). Follow the run with: gh run list --repo ${website}`)
