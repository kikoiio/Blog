'use client'

export default function SkipLink() {
  return <a className="skip-link" href="#content" onClick={event => {
    event.preventDefault()
    const content = document.querySelector<HTMLElement>('[data-panel-scroll]') ?? document.getElementById('content')
    content?.focus({ preventScroll: true })
  }}>跳到内容</a>
}
