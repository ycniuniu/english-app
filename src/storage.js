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
