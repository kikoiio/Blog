'use client'

import { useSyncExternalStore } from 'react'
import { currentAlbum } from './gallery-navigation'
import { currentFragment, replaceFragment, subscribeNavigation } from './site-navigation'
import { lastReading, rememberReading, startReading } from './reading-progress'
import { parseReadingView, parseWritingView, toggleReadingView, toggleWritingView, type ReadingView, type WritingView } from './reading-state'

export type { ReadingView } from './reading-state'

const emptyFragment = () => ''
let lastDirectory = ''

export function useReadingView(): ReadingView {
  const fragment = useSyncExternalStore(subscribeNavigation, currentFragment, emptyFragment)
  return parseReadingView(fragment)
}

export function useWritingView(): WritingView {
  const fragment = useSyncExternalStore(subscribeNavigation, currentFragment, emptyFragment)
  return parseWritingView(fragment)
}

function setViews({ reading, writing }: { reading: ReadingView; writing: WritingView }) {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const current = parseReadingView(currentFragment())
  const currentWriting = parseWritingView(currentFragment())
  if (current.kind === 'article' && reading.kind === 'closed') rememberReading(current)
  if (currentWriting.kind === 'index') lastDirectory = currentWriting.directory
  if (writing.kind === 'index') lastDirectory = writing.directory
  const album = currentAlbum()
  if (album) params.set('album', album)
  params.delete('article')
  params.delete('section')
  params.delete('view')
  params.delete('directory')
  if (writing.kind === 'index') {
    params.set('view', 'writing')
    if (writing.directory) params.set('directory', writing.directory)
  }
  if (reading.kind === 'article') {
    params.set('article', reading.slug)
    if (reading.section) params.set('section', reading.section)
  }
  replaceFragment(params)
}

export function openWriting(directory = lastDirectory) {
  setViews({ reading: parseReadingView(currentFragment()), writing: { kind: 'index', directory } })
}

export function openArticle({ slug, section = null }: { slug: string; section?: string | null }) {
  const current = new URLSearchParams(currentFragment().slice(1))
  if (current.get('article') !== slug || current.get('section') !== section) startReading({ slug, section })
  setViews({ reading: { kind: 'article', slug, section }, writing: { kind: 'closed' } })
}

export function toggleWriting() {
  setViews({
    reading: parseReadingView(currentFragment()),
    writing: toggleWritingView({ view: parseWritingView(currentFragment()), directory: lastDirectory }),
  })
}

export function closeWriting() {
  setViews({ reading: parseReadingView(currentFragment()), writing: { kind: 'closed' } })
}

export function toggleArticle() {
  setViews({
    reading: toggleReadingView({ view: parseReadingView(currentFragment()), previous: lastReading() }),
    writing: parseWritingView(currentFragment()),
  })
}

export function closeArticle() {
  setViews({ reading: { kind: 'closed' }, writing: parseWritingView(currentFragment()) })
}

export function closeReading() {
  setViews({ reading: { kind: 'closed' }, writing: { kind: 'closed' } })
}
