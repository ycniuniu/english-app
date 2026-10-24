const OTHER_IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/

export function shouldShowIosInstallTip({
  ua = '',
  platform = '',
  maxTouchPoints = 0,
  standalone = false,
  displayModeStandalone = false,
  dismissed = false,
} = {}) {
  if (dismissed || standalone || displayModeStandalone) return false
  const iPadOS = platform === 'MacIntel' && Number(maxTouchPoints) > 1
  const iOS = /iPad|iPhone|iPod/.test(ua) || iPadOS
  if (!iOS) return false
  if (OTHER_IOS_BROWSER.test(ua)) return false
  return /Safari/.test(ua) || iPadOS
}
