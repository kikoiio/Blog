import styles from './article-body.module.css'

export default function ArticleBody({ html }: { html: string }) {
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
}
