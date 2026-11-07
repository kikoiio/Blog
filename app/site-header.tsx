'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { GalleryAlbum } from '../lib/gallery-types'
import { MOBILE_LANDSCAPE_QUERY } from '../lib/gallery-performance'
import { buildGalleryTree, findGalleryFolder, galleryEntries } from '../lib/gallery-tree.mjs'
import { changeAlbum, currentAlbum, currentPhoto, subscribeAlbum, subscribePhoto } from '../lib/gallery-navigation'
import { closeArticle, closeReading, closeWriting, openArticle, toggleArticle, toggleWriting, useReadingView, useWritingView } from '../lib/reading-navigation'
import { lastReading } from '../lib/reading-progress'
import DirectoryPath from './directory-path'
import styles from './site-header.module.css'

const WritingPicker = dynamic(() => import('./writing-picker'), { ssr: false })

type NavigationAlbum = Pick<GalleryAlbum, 'id' | 'title'> & {
  cover: string | null
  swatch: string
}
type IslandStyle = CSSProperties & { '--island-accent': string }

const emptyAlbum = () => ''
const emptyPhoto = () => null
const desktopViewport = () => false
const mobileLandscape = () => window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches

function IslandClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function update() {
      setNow(new Date())
      timer = setTimeout(update, 60_000 - Date.now() % 60_000)
    }
    timer = setTimeout(update, 0)
    return () => clearTimeout(timer)
  }, [])

  const time = now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '--:--'
  return <time className={styles.clock} dateTime={now ? time : undefined} aria-label={now ? `本地时间 ${time}` : '本地时间'}>{time}</time>
}

export default function SiteHeader({ title, albums, articleIndexSrc }: { title: string; albums: NavigationAlbum[]; articleIndexSrc: string }) {
  const albumId = useSyncExternalStore(subscribeAlbum, currentAlbum, emptyAlbum)
  const selection = useSyncExternalStore(subscribePhoto, currentPhoto, emptyPhoto)
  const album = albums.find(item => item.id === albumId) ?? albums[0]
  const view = useReadingView()
  const writing = useWritingView()
  const reading = view.kind !== 'closed'
  const [revealed, setRevealed] = useState(false)
  const subscribeLandscape = useCallback((notify: () => void) => {
    const media = window.matchMedia(MOBILE_LANDSCAPE_QUERY)
    const change = () => {
      setRevealed(false)
      notify()
    }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const landscape = useSyncExternalStore(subscribeLandscape, mobileLandscape, desktopViewport)
  const [picker, setPicker] = useState<'unopened' | 'closed' | 'open' | 'contact'>('unopened')
  const closePicker = useCallback(() => {
    setRevealed(true)
    setPicker(state => state === 'unopened' ? state : 'closed')
    if (writing.kind === 'index') closeWriting()
  }, [writing.kind])
  const [folderPath, setFolderPath] = useState('')
  const tree = useMemo(() => buildGalleryTree(albums), [albums])
  const folder = findGalleryFolder(tree, folderPath) ?? tree
  const entries = galleryEntries(folder)
  const island = useRef<HTMLDivElement>(null)
  const islandId = useId()
  const handle = useRef<HTMLButtonElement>(null)
  const gesture = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const suppressHandleClickUntil = useRef(0)
  const grid = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const contactTrigger = useRef<HTMLButtonElement>(null)
  const contactLink = useRef<HTMLAnchorElement>(null)
  const contactPanelId = useId()
  const writingTrigger = useRef<HTMLButtonElement>(null)
  const readingTrigger = useRef<HTMLButtonElement>(null)
  const writingPanel = useRef<HTMLElement>(null)
  const writingPanelId = 'folio-writing-picker'
  const selectedEntry = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const showAlbums = picker === 'open' && !!album
  const showContact = picker === 'contact'
  const showWriting = writing.kind === 'index' && !showAlbums && !showContact
  const writingDirectory = writing.kind === 'index' ? writing.directory : ''
  const expanded = showAlbums || showContact || showWriting
  const navigationOpen = revealed || expanded
  const islandStyle: IslandStyle = { '--island-accent': selection?.albumId === album?.id ? selection?.swatch ?? '#775c70' : album?.swatch ?? '#775c70' }

  function closeAlbums() {
    closePicker()
    trigger.current?.focus({ preventScroll: true })
  }

  function concealNavigation() {
    if (island.current?.contains(document.activeElement)) handle.current?.focus({ preventScroll: true })
    setRevealed(false)
  }

  useEffect(() => {
    function cancelMultiTouch(event: PointerEvent) {
      if (gesture.current && event.pointerType === 'touch' && !event.isPrimary) {
        gesture.current = null
        suppressHandleClickUntil.current = Infinity
      }
    }
    document.addEventListener('pointerdown', cancelMultiTouch, true)
    return () => document.removeEventListener('pointerdown', cancelMultiTouch, true)
  }, [])

  useEffect(() => {
    if (!expanded && !reading) return
    const frame = showAlbums ? requestAnimationFrame(() => {
      if (grid.current) grid.current.scrollTop = 0
      const target = selectedEntry.current ?? grid.current?.querySelector<HTMLButtonElement>('button')
      target?.focus({ preventScroll: true })
      if (grid.current && target) grid.current.scrollTop = Math.max(0, target.offsetTop + target.offsetHeight - grid.current.clientHeight)
    }) : showContact ? requestAnimationFrame(() => contactLink.current?.focus({ preventScroll: true })) : showWriting ? requestAnimationFrame(() => writingPanel.current?.focus({ preventScroll: true })) : 0
    function onPointerDown(event: PointerEvent) {
      if (expanded && event.target instanceof Node && !island.current?.contains(event.target)) closePicker()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closePicker()
      if (reading && !expanded) closeArticle()
      const button = showContact ? contactTrigger.current : showAlbums ? trigger.current : showWriting ? writingTrigger.current : readingTrigger.current
      button?.focus({ preventScroll: true })
    }
    function onHistoryChange() {
      setPicker('closed')
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('popstate', onHistoryChange)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('popstate', onHistoryChange)
    }
  }, [showAlbums, showContact, showWriting, expanded, reading, folder.path, closePicker])

  return (
    <header className={styles.header} aria-label={`${title} · 网站管理`} data-revealed={navigationOpen} data-pinned={expanded}
      onPointerDownCapture={event => {
        if (event.isPrimary) suppressHandleClickUntil.current = 0
      }}
      onClickCapture={event => {
        if (event.detail > 0 && performance.now() < suppressHandleClickUntil.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && landscape && revealed && !expanded) {
          event.preventDefault()
          event.stopPropagation()
          concealNavigation()
        }
      }}>
      {album?.cover && !reading && !expanded && <p className={styles.orientationHint} data-orientation-hint>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect className={styles.orientationPhone} x="6" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M3 7a7 7 0 0 1 9-4M3 7V3m0 4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        请转动手机
      </p>}
      <button ref={handle} type="button" className={styles.islandHandle} data-island-handle
        aria-label={navigationOpen ? '收起导航' : '展开导航'} aria-expanded={navigationOpen} aria-controls={islandId} disabled={expanded}
        onPointerDown={event => {
          if (!landscape || !event.isPrimary || event.button !== 0) { gesture.current = null; return }
          suppressHandleClickUntil.current = 0
          gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { gesture.current = null }}
        onLostPointerCapture={() => { gesture.current = null }}
        onPointerUp={event => {
          const start = gesture.current
          gesture.current = null
          if (!start || start.pointerId !== event.pointerId) return
          const dx = event.clientX - start.x
          const dy = event.clientY - start.y
          suppressHandleClickUntil.current = performance.now() + 350
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) {
            if (navigationOpen) concealNavigation()
            else setRevealed(true)
            return
          }
          if (Math.abs(dy) < 24 || Math.abs(dy) <= Math.abs(dx) * 1.2) return
          if (dy < 0) setRevealed(true)
          else concealNavigation()
        }}
        onClick={event => {
          if (event.detail > 0 && performance.now() < suppressHandleClickUntil.current) return
          if (navigationOpen) concealNavigation()
          else setRevealed(true)
        }}><span aria-hidden="true" /></button>
      <div ref={island} id={islandId} className={styles.island} data-navigation-island style={islandStyle} data-expanded={expanded} data-contact={showContact} data-writing={showWriting} data-reading={view.kind === 'article'}
        inert={landscape && !navigationOpen}
        onFocusCapture={() => setRevealed(true)}
        onBlur={event => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) closePicker()
        }}>
        <div className={styles.drawer} inert={!expanded} aria-hidden={!expanded}>
          <div className={styles.drawerInner}>
            <section hidden={!showAlbums} id={panelId} className={styles.albumPanel} aria-label="相册" data-directory-path={folder.path}>
              <DirectoryPath path={folder.path} label="图库" onNavigate={setFolderPath} />
              <div ref={grid} className={styles.albumGrid} data-gallery-entries>
                {entries.map(item => {
                  const category = item.kind === 'folder'
                  const active = category ? album?.id === item.path || !!album?.id.startsWith(`${item.path}/`) : album?.id === item.id
                  return (
                    <button key={category ? `folder:${item.path}` : `album:${item.id}`} ref={active ? selectedEntry : undefined} type="button" className={styles.albumCard}
                      data-folder-path={category ? item.path : undefined} data-album-id={category ? undefined : item.id} data-current={active}
                      aria-label={category ? `${item.title}，打开文件夹` : undefined} aria-pressed={category ? undefined : active} onClick={() => {
                        if (category) setFolderPath(item.path)
                        else {
                          changeAlbum(item.id)
                          closeAlbums()
                        }
                      }}>
                      <span className={styles.albumCover}>
                        {picker !== 'unopened' && item.cover && <Image src={item.cover} alt="" width={240} height={160} sizes="(max-width: 540px) 42vw, 168px" loading="lazy" />}
                        {category ? <span className={styles.folderBadge} aria-hidden="true"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h4l2 2h6A1.5 1.5 0 0 1 17.5 8v7a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg></span>
                          : active && <span className={styles.check} aria-hidden="true"><svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
                      </span>
                      <span className={styles.albumName}>{item.title}</span>
                    </button>
                  )
                })}
              </div>
            </section>
            <section ref={writingPanel} id={writingPanelId} hidden={!showWriting} className={`${styles.albumPanel} ${styles.writingPanel}`} aria-label="博客列表" tabIndex={-1}>
              {showWriting && <WritingPicker indexSrc={articleIndexSrc} directory={writingDirectory} onSelect={slug => {
                setPicker('closed')
                writingTrigger.current?.focus({ preventScroll: true })
                openArticle({ slug })
              }} />}
            </section>
            <section id={contactPanelId} hidden={!showContact} className={styles.albumPanel} aria-label="联系方式">
              <a ref={contactLink} className={styles.contactLink} href="https://github.com/kikoiio" target="_blank" rel="noopener noreferrer" aria-label="GitHub：kikoiio（在新标签页打开）">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.769-.244.769-.542 0-.267-.01-.975-.015-1.913-3.13.68-3.79-1.508-3.79-1.508-.511-1.3-1.25-1.646-1.25-1.646-1.022-.699.077-.685.077-.685 1.13.08 1.725 1.16 1.725 1.16 1.005 1.722 2.636 1.225 3.278.937.102-.728.393-1.225.715-1.507-2.5-.285-5.129-1.25-5.129-5.566 0-1.23.44-2.234 1.16-3.022-.116-.285-.503-1.43.11-2.98 0 0 .945-.303 3.095 1.155a10.8 10.8 0 0 1 5.625 0c2.15-1.458 3.094-1.155 3.094-1.155.614 1.55.227 2.695.111 2.98.722.788 1.158 1.792 1.158 3.022 0 4.327-2.633 5.278-5.141 5.557.404.35.765 1.043.765 2.1 0 1.516-.014 2.739-.014 3.111 0 .3.203.65.774.54A11.25 11.25 0 0 0 12 .75Z" /></svg>
              </a>
            </section>
          </div>
        </div>

        <div className={styles.dock}>
          <IslandClock />
          <button ref={contactTrigger} type="button" className={styles.brand} data-site-brand
            aria-label={`${title} · 联系方式`} aria-expanded={showContact} aria-controls={contactPanelId}
            onClick={() => {
              closeWriting()
              setPicker(state => state === 'contact' ? 'closed' : 'contact')
            }}>{title}</button>
          <div className={styles.navigation} role="group" aria-label="浏览方式">
            <button ref={trigger} type="button" aria-label="切换图库" aria-expanded={showAlbums} aria-controls={panelId}
              data-active={!reading} disabled={!album} onClick={() => {
                closeReading()
                setPicker(state => state === 'open' ? 'closed' : 'open')
              }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.3" /><path d="m3 13 4-4 4 4 2.5-2.5L17 14M13 6.5h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button ref={writingTrigger} type="button" aria-label="Blogs" aria-pressed={showWriting} aria-expanded={showWriting} aria-controls={writingPanelId} onClick={() => {
              setPicker('closed')
              toggleWriting()
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 4h10M5 8h10M5 12h10M5 16h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </button>
            <button ref={readingTrigger} type="button" aria-label="博客显示" aria-pressed={reading} aria-controls="folio-reader" disabled={!reading && !lastReading()} onClick={() => {
              setPicker(state => state === 'unopened' ? state : 'closed')
              toggleArticle()
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4.5C8 3 5.5 3 2.5 3.8v12c3-.8 5.5-.8 7.5.7m0-12c2-1.5 4.5-1.5 7.5-.7v12c-3-.8-5.5-.8-7.5.7m0-12v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
