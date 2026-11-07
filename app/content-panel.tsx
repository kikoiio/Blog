import type { ReactNode } from 'react'
import styles from './page.module.css'

export default function ContentPanel({ children }: { children: ReactNode }) {
  return (
    <main id="content" tabIndex={-1} className={`${styles.stage} ${styles.readingStage}`}>
      <div className={styles.panelShell} data-content-panel>
        <div className={`${styles.panel} ${styles.readingPanel}`} data-panel-scroll tabIndex={0}>
          {children}
        </div>
      </div>
    </main>
  )
}
