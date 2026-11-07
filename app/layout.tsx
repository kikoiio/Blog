import type { Metadata } from 'next'
import { site } from '../.folio/site'
import SkipLink from './skip-link'
import './globals.css'

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.title}` },
  description: site.description,
  icons: site.icons,
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
