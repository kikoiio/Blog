export function articleHref(slug: string, section?: string) {
  const params = new URLSearchParams({ article: slug })
  if (section) params.set('section', section)
  return `/#${params}`
}

export function albumHref(id: string) {
  return `/#${new URLSearchParams({ album: id })}`
}

export function albumTitle(title: string) {
  return title.split(' / ').at(-1) || title
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}
