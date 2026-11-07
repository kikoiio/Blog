export type SiteContact = {
  label: string
  url: string
}

type SiteIcon = {
  url: string
  sizes: string
  type: string
}

export type SiteConfig = {
  title: string
  description: string
  contacts: SiteContact[]
  icons: {
    icon: SiteIcon[]
    apple: SiteIcon[]
  }
}
