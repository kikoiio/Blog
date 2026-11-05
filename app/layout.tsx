import type { Metadata } from 'next'
import SiteShell from '@/components/SiteShell'
import { getShellFiles } from '@/lib/shell-data'
import { themeBoot } from '@/lib/themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'aries@blog: ~',
  description: '一个终端模样的个人博客:敲 help 开始,theme 换任意颜色。',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <SiteShell files={getShellFiles()}>{children}</SiteShell>
      </body>
    </html>
  )
}
