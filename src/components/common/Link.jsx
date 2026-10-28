import React from 'react'
import { safeNextPath } from './urlUtils.js'

export { safeNextPath }

export function Link({ href, className = '', onClick, children, ...props }) {
  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) return
    event.preventDefault()
    if (window.location.pathname + window.location.search !== href) {
      window.history.pushState(null, '', href)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }
  return <a href={href} className={className} onClick={handleClick} {...props}>{children}</a>
}
