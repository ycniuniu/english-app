export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode can refuse storage. The page still works for this visit.
  }
}

export function readString(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore quota and private-mode failures.
  }
}

export function readStorageEntry(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return { status: 'empty', raw: null, value: null }
    try {
      return { status: 'ok', raw, value: JSON.parse(raw) }
    } catch {
      return { status: 'corrupt', raw, value: null }
    }
  } catch {
    return { status: 'blocked', raw: null, value: null }
  }
}

export function writeTextResult(key, text) {
  try {
    localStorage.setItem(key, text)
    return { ok: true }
  } catch (error) {
    const name = error && error.name ? error.name : ''
    const quota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(String(error))
    return { ok: false, reason: quota ? 'quota' : 'blocked' }
  }
}

export function writeJsonResult(key, value) {
  let text = ''
  try {
    text = JSON.stringify(value)
  } catch {
    return { ok: false, reason: 'encode' }
  }
  return writeTextResult(key, text)
}

export function storageFailureMessage(reason) {
  if (reason === 'quota') return '这台设备的存储满了，这次没有写入。已经在本机的单词记录没有被清掉。'
  if (reason === 'blocked') return '浏览器没有允许保存（常见于隐私模式）。这次没有写入，已经在本机的记录还在。'
  return '这次没有保存成功。已经在本机的单词记录没有被清掉。'
}
