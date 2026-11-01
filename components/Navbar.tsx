'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '风景漫游' },
    { href: '/articles', label: '文章' },
    { href: '/about', label: '关于' },
  ]

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <div className="site-nav-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${pathname === item.href ? ' is-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
        </div>
      </div>
    </nav>
  )
}
