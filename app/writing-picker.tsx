'use client'

import { useLayoutEffect, useMemo, useRef, type MouseEvent } from 'react'
import { loadArticleIndex } from '../lib/article-data'
import { articleHref } from '../lib/article-links'
import type { ArticleIndex } from '../lib/article-types'
import { buildDirectoryTree, findDirectoryFolder, parentDirectory } from '../lib/directory-tree.mjs'
import { openWriting } from '../lib/reading-navigation'
import { rememberDirectory } from '../lib/reading-progress'
import { useResource } from '../lib/use-resource'
import DirectoryPath from './directory-path'
import styles from './site-header.module.css'

const emptyArticles: ArticleIndex = []

export default function WritingPicker({ indexSrc, directory, onSelect }: {
  indexSrc: string
  directory: string
  onSelect: (slug: string) => void
}) {
  const list = useRef<HTMLDivElement>(null)
  const request = useMemo(() => ({
    key: indexSrc,
    load: (signal: AbortSignal) => loadArticleIndex(indexSrc, signal),
  }), [indexSrc])
  const { state, retry } = useResource(request)
  const articles = state.kind === 'ready' ? state.data : emptyArticles
  const tree = useMemo(() => buildDirectoryTree(articles.map(item => ({
    ...item, directory: item.directory ?? parentDirectory(item.slug),
  }))), [articles])
  const folder = findDirectoryFolder(tree, directory) ?? tree

  useLayoutEffect(() => {
    const root = list.current
    if (!root) return
    const progress = state.kind === 'ready' ? rememberDirectory({ indexSrc, directory: folder.path }) : null
    let restored = false
    const frame = requestAnimationFrame(() => {
      root.scrollTop = progress?.scrollTop ?? 0
      root.focus({ preventScroll: true })
      restored = true
    })
    return () => {
      cancelAnimationFrame(frame)
      if (progress && restored) progress.scrollTop = root.scrollTop
    }
  }, [indexSrc, folder.path, state.kind])

  function followArticle(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect(slug)
  }

  return <>
    <DirectoryPath path={folder.path} label="博客" onNavigate={openWriting} wrap />
    <div ref={list} className={styles.writingEntries} tabIndex={0} aria-busy={state.kind === 'loading'} data-writing-entries data-state={state.kind} data-directory-path={folder.path}>
      {state.kind === 'error' ? <div className={styles.writingStatus} role="alert">
        <p>博客加载失败</p>
        <button type="button" className={`${styles.albumCard} ${styles.writingEntry}`} onClick={retry}>重新加载</button>
      </div> : state.kind !== 'ready' ? <p className={styles.writingStatus} role="status">正在加载博客…</p> : <>
        {folder.children.map(child => <button key={`folder:${child.path}`} type="button" className={`${styles.albumCard} ${styles.writingEntry}`} data-folder-path={child.path} aria-label={`${child.title}，打开文件夹`} onClick={() => openWriting(child.path)}>
          <svg className={styles.writingIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h4l2 2h6A1.5 1.5 0 0 1 17.5 8v7a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          <span>{child.title}</span>
          <svg className={styles.writingChevron} width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>)}
        {folder.items.map(item => <a key={`article:${item.slug}`} href={articleHref(item.slug)} className={`${styles.albumCard} ${styles.writingEntry}`} data-article-slug={item.slug} onClick={event => followArticle(event, item.slug)}>
          <span>{item.title}</span>
        </a>)}
        {folder.children.length === 0 && folder.items.length === 0 && <p className={styles.writingStatus}>还没有博客</p>}
      </>}
    </div>
  </>
}
