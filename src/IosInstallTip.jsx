import { useState } from 'react'
import { shouldShowIosInstallTip } from './ios-home.js'
import { readString, writeString } from './storage.js'

const TIP_KEY = 'kaikou.home-tip.v1'

function detected() {
  if (typeof window === 'undefined') return false
  return shouldShowIosInstallTip({
    ua: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: window.navigator.standalone === true,
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    dismissed: readString(TIP_KEY, '') === 'dismissed',
  })
}

export function IosInstallTip() {
  const [open, setOpen] = useState(detected)
  if (!open) return null
  return (
    <div className="home-tip" role="note">
      <p>想放到主屏幕：点 Safari 底部的分享按钮，再选「添加到主屏幕」。</p>
      <button
        type="button"
        onClick={() => {
          writeString(TIP_KEY, 'dismissed')
          setOpen(false)
        }}
      >
        知道了
      </button>
    </div>
  )
}
