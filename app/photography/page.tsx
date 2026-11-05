import AlbumWall from '@/components/AlbumWall'
import { getPhotographyAlbums } from '@/lib/articles'

export default function PhotographyPage() {
  return <AlbumWall albums={getPhotographyAlbums()} />
}
