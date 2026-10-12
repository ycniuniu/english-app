import { useSyncExternalStore } from 'react'
import { chunkForSpeech } from './text.js'
import { chooseVoice, chosenKind, voiceKind } from './voice.js'

const listeners = new Set()

let generation = 0
let session = null
let keepAlive = null
let started = false

let snapshot = {
  status: 'idle',
  id: null,
  index: 0,
  total: 0,
  chunk: '',
  voice: 'pending',
  voiceName: '',
  jaVoice: 'pending',
  jaVoiceName: '',
  message: '',
}

function publish(patch) {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener(snapshot)
}

export function getSnapshot() {
  return snapshot
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSpeech() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function clearKeepAlive() {
  if (keepAlive) {
    clearInterval(keepAlive)
    keepAlive = null
  }
}

function refreshVoice() {
  const synth = window.speechSynthesis
  if (!synth) {
    publish({ voice: 'unsupported', voiceName: '', jaVoice: 'unsupported', jaVoiceName: '' })
    return
  }
  const voices = synth.getVoices()
  const chosen = chooseVoice(voices)
  const japanese = chooseVoice(voices, 'ja')
  publish({
    voice: chosenKind(voices),
    voiceName: chosen?.name || '',
    jaVoice: voices.length ? (japanese ? 'ja' : 'none') : 'pending',
    jaVoiceName: japanese?.name || '',
  })
}

export function initSpeech() {
  if (started || typeof window === 'undefined') return
  started = true
  if (!window.speechSynthesis) {
    publish({ voice: 'unsupported', voiceName: '', jaVoice: 'unsupported', jaVoiceName: '' })
    return
  }
  refreshVoice()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoice)
  // Some phone browsers fill the voice list a moment later, without another event.
  window.setTimeout(refreshVoice, 250)
  window.setTimeout(refreshVoice, 1000)
}

function stopQuiet() {
  generation += 1
  session = null
  clearKeepAlive()
  const synth = window.speechSynthesis
  if (synth && (synth.speaking || synth.pending)) synth.cancel()
}

export function stopSpeech() {
  stopQuiet()
  publish({
    status: 'idle',
    id: null,
    index: 0,
    total: 0,
    chunk: '',
    message: '',
  })
}

function startKeepAlive() {
  clearKeepAlive()
  // Chrome pauses speechSynthesis on its own during long readings.
  keepAlive = setInterval(() => {
    const synth = window.speechSynthesis
    if (!session || !synth) {
      clearKeepAlive()
      return
    }
    if (synth.paused) synth.resume()
  }, 2000)
}

export function speakText(text, { id, rate = 1, lang = 'en-US' } = {}) {
  const synth = window.speechSynthesis
  if (!synth) {
    publish({
      status: 'idle',
      message: '这个浏览器不能朗读，请换 Safari 或 Chrome 打开。',
    })
    return
  }

  const wasActive = synth.speaking || synth.pending
  stopQuiet()

  const chunks = chunkForSpeech(text)
  if (!chunks.length) {
    publish({ status: 'idle', id: null, chunk: '', total: 0, index: 0, message: '没有可以朗读的内容。' })
    return
  }

  const voices = synth.getVoices()
  const family = String(lang).toLowerCase().startsWith('ja')
    ? 'ja'
    : String(lang).toLowerCase().startsWith('zh')
      ? 'zh'
      : 'en'
  const chosen = chooseVoice(voices, family)
  const utteranceLang = chosen?.lang || (family === 'ja' ? 'ja-JP' : family === 'zh' ? 'zh-CN' : 'en-US')
  const token = generation
  const utterances = chunks.map((part) => {
    const utterance = new SpeechSynthesisUtterance(part)
    utterance.lang = utteranceLang
    if (chosen) {
      try {
        utterance.voice = chosen
      } catch {
        // Ignore a voice object this browser will not accept. lang still selects English.
      }
    }
    utterance.rate = rate
    utterance.pitch = 1
    return utterance
  })

  session = { generation: token, id, utterances }
  if (voices.length && family === 'en') {
    publish({
      voice: chosen ? voiceKind(chosen) : 'none',
      voiceName: chosen?.name || '',
    })
  }

  utterances.forEach((utterance, index) => {
    utterance.onstart = () => {
      if (session?.generation !== token) return
      publish({
        status: 'speaking',
        id,
        index,
        total: chunks.length,
        chunk: chunks[index],
        message: '',
      })
    }
    utterance.onend = () => {
      if (session?.generation !== token) return
      if (index !== chunks.length - 1) return
      session = null
      clearKeepAlive()
      publish({
        status: 'idle',
        id: null,
        index: 0,
        total: 0,
        chunk: '',
        message: '',
      })
    }
    utterance.onerror = (event) => {
      if (session?.generation !== token) return
      const reason = event.error || ''
      if (reason === 'interrupted' || reason === 'canceled' || reason === 'cancelled') return
      session = null
      clearKeepAlive()
      publish({
        status: 'idle',
        id: null,
        index: 0,
        total: 0,
        chunk: '',
        message: '朗读中断了，请再点一次。',
      })
    }
  })

  const begin = () => {
    if (generation !== token) return
    const live = window.speechSynthesis
    if (!live) return
    // iOS can swallow speak() that follows cancel() in the same tap.
    // A silent utterance takes that hit so the real lines still play.
    if (wasActive && isIOSDevice()) {
      const primer = new SpeechSynthesisUtterance(' ')
      primer.volume = 0
      primer.rate = 1
      primer.lang = utteranceLang
      live.speak(primer)
    }
    for (const utterance of utterances) live.speak(utterance)
    startKeepAlive()
  }

  publish({
    status: 'speaking',
    id,
    index: 0,
    total: chunks.length,
    chunk: chunks[0],
    message: '',
  })

  if (wasActive && !isIOSDevice()) {
    setTimeout(begin, 60)
    return
  }
  begin()
}

function isIOSDevice() {
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOS
}
