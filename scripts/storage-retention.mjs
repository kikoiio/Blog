import { validateRelease } from './release.mjs'
import { managedObject } from '../workers/storage-keys.mjs'

export const retentionDays = 7
const grace = retentionDays * 24 * 60 * 60 * 1000
const id = ({ kind, key }) => `${kind}:${key}`
const recipes = { v1: [640, 2400], v2: [640, 1600, 2400] }

export function releaseObjects(release, recipe) {
  validateRelease(release)
  if (!Object.hasOwn(recipes, recipe)) throw new Error('Unknown deployed image recipe')
  const objects = [{ kind: 'source', key: `releases/${release.revision}.json` }]
  for (const entry of release.files) {
    objects.push({ kind: 'source', key: entry.objectKey })
    if (/^(blogs|pictures)\/.+\.(png|jpe?g|webp|avif)$/i.test(entry.path)) {
      for (const size of recipes[recipe]) objects.push({ kind: 'media', key: `images/${recipe}/${entry.sha256}/${size}.webp` })
      objects.push({ kind: 'media', key: `metadata/${recipe}/${entry.sha256}.json` })
    }
  }
  return objects
}

export function retentionPlan({ objects, referenced, previous, now, revision, deploymentId, previousDeploymentId }) {
  if (!Number.isSafeInteger(now) || now < 0 || !/^[a-f0-9]{64}$/.test(revision)
    || !/^[a-f0-9]{64}$/.test(deploymentId) || (previousDeploymentId !== null && !/^[a-f0-9]{64}$/.test(previousDeploymentId))) throw new Error('Invalid retention clock or revision')
  const old = new Map()
  if (previous !== null) {
    if (!previous || previous.version !== 1 || !Array.isArray(previous.unused)
      || !Number.isSafeInteger(previous.checkedAt) || previous.checkedAt > now
      || !/^[a-f0-9]{64}$/.test(previous.activeRevision) || !/^[a-f0-9]{64}$/.test(previous.deploymentId)) throw new Error('Invalid retention ledger')
    for (const entry of previous.unused) {
      if (!entry || !managedObject(entry.kind, entry.key) || !Number.isSafeInteger(entry.since)
        || entry.since < 0 || entry.since > previous.checkedAt || !Number.isFinite(Date.parse(entry.uploaded))
        || old.has(id(entry))) throw new Error('Invalid retention entry')
      old.set(id(entry), entry)
    }
  }
  if (previous?.deploymentId === deploymentId && previous.activeRevision !== revision) throw new Error('Deployment identity changed its revision')
  // A deployment whose reconciliation failed may have briefly restored files.
  // If a transition was missed, restart timers instead of guessing their age.
  const continuous = previous === null || previous.deploymentId === deploymentId || previous.deploymentId === previousDeploymentId
  const protectedKeys = new Set(referenced.map(id))
  const seen = new Set()
  const unused = []
  const expired = []
  for (const object of objects) {
    if (!object || typeof object.key !== 'string' || !['source', 'media'].includes(object.kind)
      || !Number.isFinite(Date.parse(object.uploaded))) throw new Error('Invalid R2 object inventory')
    if (seen.has(id(object))) throw new Error('Duplicate R2 inventory object')
    seen.add(id(object))
    if (!managedObject(object.kind, object.key) || protectedKeys.has(id(object))) continue
    const before = continuous ? old.get(id(object)) : undefined
    const since = before && before.uploaded === object.uploaded ? before.since : now
    const entry = { kind: object.kind, key: object.key, uploaded: object.uploaded, since }
    unused.push(entry)
    if (now - since >= grace) expired.push(entry)
  }
  // Invalidate cached metadata first so an interrupted sweep cannot leave a
  // reusable metadata record pointing at already deleted image variants.
  const priority = entry => entry.key.startsWith('metadata/') ? 0 : entry.kind === 'media' ? 1 : entry.key.startsWith('sources/') ? 2 : 3
  expired.sort((left, right) => priority(left) - priority(right))
  return { state: { version: 1, checkedAt: now, activeRevision: revision, deploymentId, unused }, expired }
}

export async function maintainStorage({ api, lease, sourceBucket, marker, now = Date.now(), apply = false, assertDeployed = async () => {} }) {
  if (!marker || marker.version !== 1 || !/^[a-f0-9]{64}$/.test(marker.revision)
    || !/^[a-f0-9]{64}$/.test(marker.deploymentId)
    || (marker.previousDeploymentId !== null && !/^[a-f0-9]{64}$/.test(marker.previousDeploymentId))
    || !Object.hasOwn(recipes, marker.recipe)) throw new Error('Invalid live deployment marker')
  const active = validateRelease(await api.getJSON(sourceBucket, `releases/${marker.revision}.json`))
  if (active.revision !== marker.revision) throw new Error('Deployment release mismatch')
  const pending = validateRelease(await api.getJSON(sourceBucket, 'releases/latest.json'))
  const liveObjects = releaseObjects(active, marker.recipe)
  const pendingObjects = releaseObjects(pending, marker.recipe)
  const objects = []
  for (const [kind, prefixes] of [['source', ['sources/', 'releases/']], ['media', ['images/', 'metadata/']]]) {
    for (const prefix of prefixes) objects.push(...await lease.inventory(kind, prefix))
  }
  const present = new Set(objects.map(id))
  // An incomplete restore/build or inventory must never turn into a deletion plan.
  for (const object of [...liveObjects, ...pendingObjects.filter(object => object.kind === 'source')]) {
    if (!present.has(id(object))) throw new Error(`Referenced object missing: ${id(object)}`)
  }
  const previous = await lease.state()
  const plan = retentionPlan({ objects, referenced: [...liveObjects, ...pendingObjects], previous, now, revision: marker.revision,
    deploymentId: marker.deploymentId, previousDeploymentId: marker.previousDeploymentId })
  await assertDeployed()
  if (apply) {
    // Keep expired entries until deletion succeeds; interrupted cleanup is retryable.
    await lease.save(plan.state)
    for (const object of plan.expired) {
      await assertDeployed()
      await lease.remove(object)
    }
  }
  return { mode: apply ? 'apply' : 'preview', retentionDays, activeRevision: marker.revision, managedUnused: plan.state.unused.length, eligibleForDeletion: plan.expired.length, objects: plan.state.unused }
}
