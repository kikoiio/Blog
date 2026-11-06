export type GalleryPhoto = {
  id: string
  src: string
  alt: string
  width: number
  height: number
  swatch: string
  backdrop: string
  ink: string
}

export type GalleryAlbum = {
  id: string
  title: string
  photos: GalleryPhoto[]
}
