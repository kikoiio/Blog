'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShellProvider } from '@/lib/shell-context'
import { loadCwd, SESSION_CWD_EVENT } from '@/lib/shell'
import type { ShellFile } from '@/lib/shell-data'
import PromptLine from '@/components/PromptLine'

export default function SiteShell({ files, children }: { files: ShellFile[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const [cwd, setCwd] = useState(() => (typeof window !== 'undefined' ? loadCwd() : '~'))

  const refreshCwd = useCallback(() => {
    setCwd(loadCwd())
  }, [])

  useEffect(() => {
    window.addEventListener(SESSION_CWD_EVENT, refreshCwd)
    return () => {
      window.removeEventListener(SESSION_CWD_EVENT, refreshCwd)
    }
  }, [refreshCwd])

  return (
    <ShellProvider files={files}>
      {/* 极简素白晨光背景 */}
      <div className="term-backdrop" aria-hidden="true" />

      <div className="term-window-stage">
        <div className="term-window-frame">
          {/* 纯净极简标题栏 */}
          <header className="term-titlebar">
            <div className="term-titlebar-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>

            <span className="term-titlebar-title">
              <strong>aries@blog</strong>: {cwd} — zsh
            </span>

            <nav className="term-titlebar-nav" aria-label="快捷导航">
              <Link href="/" className={`term-nav-link ${pathname === '/' ? 'is-active' : ''}`}>
                ~
              </Link>
              <Link href="/articles" className={`term-nav-link ${pathname.startsWith('/articles') ? 'is-active' : ''}`}>
                articles
              </Link>
              <Link href="/photography" className={`term-nav-link ${pathname === '/photography' ? 'is-active' : ''}`}>
                photos
              </Link>
            </nav>
          </header>

          {/* 纯净终端屏幕 */}
          <main className="term-screen">{children}</main>

          {/* 文章页面的底部 tmux 命令行 */}
          {pathname !== '/' && <PromptLine />}
        </div>
      </div>
    </ShellProvider>
  )
}
