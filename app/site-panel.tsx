'use client'

import dynamic from 'next/dynamic'
import type { GalleryAlbum } from '../lib/gallery-types'
import { useReadingView, useWritingView } from '../lib/reading-navigation'
import Gallery from './gallery'

const ReadingOverlay = dynamic(() => import('./reading-overlay'), { ssr: false })

export default function SitePanel({ albums, articleIndexSrc }: {
  albums: GalleryAlbum[]
  articleIndexSrc: string
}) {
  const view = useReadingView()
  const writing = useWritingView()
  const reading = view.kind === 'article'
  return <Gallery albums={albums} reading={reading}>
    {view.kind === 'article' && <ReadingOverlay indexSrc={articleIndexSrc} albums={albums} view={view} autoFocus={writing.kind === 'closed'} />}
  </Gallery>
}
