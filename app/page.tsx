import { albums } from '../.folio/gallery'
import { articleIndexSrc } from '../.folio/articles'
import { site } from '../.folio/site'
import SitePanel from './site-panel'
import SiteHeader from './site-header'

export default function Page() {
  return <>
    <SiteHeader articleIndexSrc={articleIndexSrc} title={site.title} contacts={site.contacts} albums={albums.map(({ id, title, photos }) => ({
      id,
      title,
      cover: photos[0]?.thumbnailSrc ?? photos[0]?.src ?? null,
      swatch: photos[0]?.swatch ?? '#775c70',
    }))} />
    <SitePanel albums={albums} articleIndexSrc={articleIndexSrc} />
  </>
}
