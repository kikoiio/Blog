import { syncArchive } from './archive.mjs'

const result = await syncArchive()
console.log(`Folio: ${result.albums} albums, ${result.photos} pictures, ${result.articles} articles`)
