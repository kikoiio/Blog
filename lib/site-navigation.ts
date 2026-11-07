export function subscribeNavigation(callback: () => void) {
  window.addEventListener('hashchange', callback)
  window.addEventListener('popstate', callback)
  return () => {
    window.removeEventListener('hashchange', callback)
    window.removeEventListener('popstate', callback)
  }
}

export function currentFragment() {
  return window.location.hash
}

export function replaceFragment(params: URLSearchParams) {
  const hash = params.size ? `#${params}` : ''
  if (window.location.hash === hash) return
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
