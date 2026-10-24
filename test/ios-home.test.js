import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowIosInstallTip } from '../src/ios-home.js'

const iphoneSafari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'

test('shows the home-screen tip only for iOS Safari outside standalone mode', () => {
  assert.equal(shouldShowIosInstallTip({ ua: iphoneSafari }), true)
  assert.equal(shouldShowIosInstallTip({ ua: iphoneSafari, standalone: true }), false)
  assert.equal(shouldShowIosInstallTip({ ua: iphoneSafari, displayModeStandalone: true }), false)
  assert.equal(shouldShowIosInstallTip({ ua: iphoneSafari, dismissed: true }), false)
  assert.equal(
    shouldShowIosInstallTip({
      ua: iphoneSafari.replace('Safari', 'CriOS'),
    }),
    false,
  )
  assert.equal(
    shouldShowIosInstallTip({
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    }),
    false,
  )
  assert.equal(
    shouldShowIosInstallTip({
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    true,
  )
})
