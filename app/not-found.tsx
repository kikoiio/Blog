import Link from 'next/link'
import styles from './content.module.css'
import ContentPanel from './content-panel'

export default function NotFound() {
  return <ContentPanel><div className={styles.shell}><div className={styles.empty}><p>404</p><h1>这一页还没有留下内容。</h1><p>换个地方，继续看看。</p><Link href="/">返回图库</Link></div></div></ContentPanel>
}
