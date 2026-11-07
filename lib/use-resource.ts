'use client'

import { useEffect, useState } from 'react'

type ResourceState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; data: T }

type ResourceRequest<T> = { key: string; load: (signal: AbortSignal) => Promise<T> }

export function useResource<T>(request: ResourceRequest<T> | null) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    attempt: number
    state: Extract<ResourceState<T>, { kind: 'ready' | 'error' }>
  } | null>(null)

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    request.load(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key: request.key, attempt, state: { kind: 'ready', data } })
    }, () => {
      if (!controller.signal.aborted) setResult({ key: request.key, attempt, state: { kind: 'error' } })
    })
    return () => controller.abort()
  }, [request, attempt])

  // Match during render so the previous article disappears immediately when
  // the slug changes, before the new request's effect has run.
  const state: ResourceState<T> = request === null ? { kind: 'idle' }
    : result?.key === request.key && result.attempt === attempt ? result.state : { kind: 'loading' }
  return { state, retry: () => setAttempt(value => value + 1) }
}
