import { parentDirectory } from '../lib/directory-tree.mjs'
import styles from './directory-path.module.css'

export default function DirectoryPath({ path, label, onNavigate, wrap = false }: {
  path: string
  label: string
  onNavigate: (path: string) => void
  wrap?: boolean
}) {
  if (!path) return null
  const breadcrumbs = path.split('/').map((segment, index, segments) => ({
    path: segments.slice(0, index + 1).join('/'), title: segment.replaceAll(/[-_]/g, ' '),
  }))
  return (<nav className={styles.path} aria-label={`${label}路径`} data-wrap={wrap}>
    <button type="button" className={styles.pathButton} aria-label="返回上一级" onClick={() => onNavigate(parentDirectory(path))}>
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <ol className={styles.breadcrumbs}>
      <li><button type="button" className={styles.pathButton} aria-label={`全部${label}`} onClick={() => onNavigate('')}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m3 9 7-6 7 6v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 17v-6h4v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
      </button></li>
      {breadcrumbs.map(item => <li key={item.path}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {item.path === path ? <span className={styles.crumbName} aria-current="location">{item.title}</span> : <button type="button" className={styles.crumbButton} onClick={() => onNavigate(item.path)}>{item.title}</button>}
      </li>)}
    </ol>
  </nav>)
}
