import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: process.env.FOLIO_SITE_TITLE || 'Folio',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
