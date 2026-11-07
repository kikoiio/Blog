export type ReadingLocation = { slug: string; section: string | null }

type ReadingProgress = ReadingLocation & { scrollTop: number | null }

let latest: ReadingProgress | null = null

export function lastReading() {
  return latest
}

export function startReading(location: ReadingLocation) {
  latest = { ...location, scrollTop: null }
  return latest
}

export function rememberReading(location: ReadingLocation) {
  if (latest?.slug === location.slug && latest.section === location.section) return latest
  return startReading(location)
}

const directories = new Map<string, { scrollTop: number }>()

export function rememberDirectory({ indexSrc, directory }: { indexSrc: string; directory: string }) {
  const key = JSON.stringify([indexSrc, directory])
  const progress = directories.get(key) ?? { scrollTop: 0 }
  directories.delete(key)
  directories.set(key, progress)
  if (directories.size > 32) {
    const oldest = directories.keys().next().value
    if (oldest !== undefined) directories.delete(oldest)
  }
  return progress
}
