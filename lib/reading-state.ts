import type { ReadingLocation } from './reading-progress'

export type ReadingView = { kind: 'closed' } | ({ kind: 'article' } & ReadingLocation)
export type WritingView = { kind: 'closed' } | { kind: 'index'; directory: string }

export function parseReadingView(fragment: string): ReadingView {
  const params = new URLSearchParams(fragment.replace(/^#/, ''))
  const slug = params.get('article')
  if (slug) return { kind: 'article', slug, section: params.get('section') }
  return { kind: 'closed' }
}

export function parseWritingView(fragment: string): WritingView {
  const params = new URLSearchParams(fragment.replace(/^#/, ''))
  return params.get('view') === 'writing' ? { kind: 'index', directory: params.get('directory') ?? '' } : { kind: 'closed' }
}

export function toggleReadingView({ view, previous }: {
  view: ReadingView
  previous: ReadingLocation | null
}): ReadingView {
  return view.kind === 'closed' && previous ? { kind: 'article', slug: previous.slug, section: previous.section } : { kind: 'closed' }
}

export function toggleWritingView({ view, directory }: { view: WritingView; directory: string }): WritingView {
  return view.kind === 'closed' ? { kind: 'index', directory } : { kind: 'closed' }
}
