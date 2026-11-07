import { buildDirectoryTree, findDirectoryFolder } from './directory-tree.mjs'

/**
 * @typedef {object} GalleryAlbumInput
 * @property {string} id
 * @property {string} title
 * @property {string | null} cover
 * @property {unknown} [swatch]
 */

/**
 * @typedef {object} GalleryAlbumEntry
 * @property {'album'} kind
 * @property {string} id
 * @property {string} title
 * @property {string | null} cover
 */

/**
 * @typedef {object} GalleryFolder
 * @property {'folder'} kind
 * @property {string} path
 * @property {string} title
 * @property {string | null} cover
 * @property {GalleryAlbumEntry | null} album
 * @property {GalleryFolder[]} children
 */

/**
 * @param {GalleryAlbumInput} album
 * @returns {GalleryAlbumEntry}
 */
function createAlbumEntry(album) {
  return {
    kind: 'album',
    id: album.id,
    title: album.title.split(' / ').at(-1) ?? album.title,
    cover: album.cover,
  }
}

/**
 * Build a navigable folder tree from albums whose ids are slash-separated paths.
 * Every path segment gets its own folder, including ancestors without an album.
 *
 * @param {readonly GalleryAlbumInput[]} albums
 * @returns {GalleryFolder}
 */
export function buildGalleryTree(albums) {
  const tree = buildDirectoryTree(albums.map(album => ({
    ...createAlbumEntry(album), directory: album.id === '.' ? '' : album.id,
  })))
  /** @param {import('./directory-tree.mjs').DirectoryFolder<GalleryAlbumEntry & { directory: string }>} folder
   * @returns {GalleryFolder} */
  function adapt(folder) {
    const entry = folder.items[0]
    return { kind: 'folder', path: folder.path, title: folder.title, cover: folder.cover,
      album: entry ? { kind: 'album', id: entry.id, title: entry.title, cover: entry.cover } : null,
      children: folder.children.map(adapt) }
  }
  return adapt(tree)
}

/**
 * Find a folder using its complete slash-separated path. The empty path is root.
 *
 * @param {GalleryFolder} root
 * @param {string} path
 * @returns {GalleryFolder | null}
 */
export function findGalleryFolder(root, path) {
  return findDirectoryFolder(root, path)
}

/**
 * List this folder's album and immediate child entries in display order.
 * Leaf folders with albums resolve directly to their album entry.
 *
 * @param {GalleryFolder} folder
 * @returns {(GalleryAlbumEntry | GalleryFolder)[]}
 */
export function galleryEntries(folder) {
  const entries = []
  if (folder.album) entries.push(folder.album)

  for (const child of folder.children) {
    if (child.children.length === 0 && child.album) entries.push(child.album)
    else entries.push(child)
  }

  return entries
}
