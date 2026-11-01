import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <Navbar />
      <div className="listing-page">
        <div className="about-shell">
          <h1>关于</h1>
          <p className="about-lede">
            这是 Aries 的个人博客，展示技术文章和摄影作品。
          </p>
          <Link
            href="/"
            className="primary-link"
          >
            返回风景漫游
          </Link>
        </div>
      </div>
    </>
  )
}
