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
  // Extensions such as Trancy may inject attributes into <html> before hydration.
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  )
}
