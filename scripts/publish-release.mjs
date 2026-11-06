import path from 'node:path'
import { createRelease } from './release.mjs'

export async function publishRelease({ archiveRoot, release, manifest, sourceBucket, client, requestBuild, report = console.log }) {
  let uploaded = 0
  for (const entry of release.files) {
    if (!await client.exists(sourceBucket, entry.objectKey, entry.size)) {
      await client.putFile(sourceBucket, entry.objectKey, path.join(archiveRoot, entry.path))
      uploaded++
    }
    report(`Source ready: ${entry.path}`)
  }
  if ((await createRelease(archiveRoot)).revision !== release.revision) {
    throw new Error('Archive changed during upload; run publish again after editing finishes')
  }
  await client.putFile(sourceBucket, `releases/${release.revision}.json`, manifest, 'application/json')
  await client.putFile(sourceBucket, 'releases/latest.json', manifest, 'application/json')
  await requestBuild(release.revision)
  return uploaded
}
