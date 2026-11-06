import { albums } from '../.folio/gallery'
import Gallery from './gallery'

export default function Page() {
  return <Gallery albums={albums} />
}
