/**
 * @template T
 * @typedef {object} DirectoryFolder
 * @property {'folder'} kind
 * @property {string} path
 * @property {string} title
 * @property {string | null} cover
 * @property {T[]} items
 * @property {DirectoryFolder<T>[]} children
 */
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** @template {{ directory: string, cover: string | null }} T
 * @param {readonly T[]} items
 * @returns {DirectoryFolder<T>}
 */
export function buildDirectoryTree(items) {
  /** @param {string} path @param {string} title @returns {DirectoryFolder<T>} */
  const create = (path, title) => ({ kind: 'folder', path, title, cover: null, items: [], children: [] })
  const root = create('', '')
  const folders = new Map([['', root]])
  for (const item of items) {
    let parent = root
    let path = ''
    for (const segment of item.directory.split('/').filter(Boolean)) {
      path = path ? `${path}/${segment}` : segment
      let folder = folders.get(path)
      if (!folder) {
        folder = create(path, segment.replaceAll(/[-_]/g, ' '))
        folders.set(path, folder)
        parent.children.push(folder)
      }
      parent = folder
    }
    parent.items.push(item)
  }
  /** @param {DirectoryFolder<T>} folder */
  function finish(folder) {
    folder.children.sort((a, b) => collator.compare(a.path, b.path))
    folder.children.forEach(finish)
    folder.cover = folder.items.find(item => item.cover !== null)?.cover
      ?? folder.children.find(child => child.cover !== null)?.cover ?? null
  }
  finish(root)
  return root
}

/** @template {{ path: string, children: T[] }} T
 * @param {T} root @param {string} path @returns {T | null}
 */
export function findDirectoryFolder(root, path) {
  if (root.path === path) return root
  let folder = root
  let current = ''
  for (const segment of path.split('/')) {
    current = current ? `${current}/${segment}` : segment
    const child = folder.children.find(candidate => candidate.path === current)
    if (!child) return null
    folder = child
  }
  return folder
}

/** @param {string} path */
export function parentDirectory(path) {
  return path.split('/').slice(0, -1).join('/')
}
