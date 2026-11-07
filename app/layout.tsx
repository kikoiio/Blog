import type { Metadata } from 'next'
import SkipLink from './skip-link'
import './globals.css'

const title = process.env.FOLIO_SITE_TITLE || 'Folio'

export const metadata: Metadata = {
  title: { default: title, template: `%s · ${title}` },
  description: '用影像和文字，记录值得留下的日常。',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  )
}
