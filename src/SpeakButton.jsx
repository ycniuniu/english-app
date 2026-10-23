import { SpeakerIcon, StopIcon } from './icons.jsx'
import { speakText, stopSpeech, useSpeech } from './speech.js'

export function SpeakButton({ text, id, rate, label = '朗读这句', compact = false, lang = 'en-US', caption = '' }) {
  const speech = useSpeech()
  const active = speech.status === 'speaking' && speech.id === id
  const className = ['speak', compact ? 'tiny' : '', caption ? 'labeled' : '', active ? 'on' : ''].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={className}
      aria-label={active ? '停止朗读' : label}
      aria-pressed={active}
      onClick={() => {
        if (active) stopSpeech()
        else speakText(text, { id, rate, lang })
      }}
    >
      {active ? <StopIcon /> : <SpeakerIcon />}
      {caption ? <span>{active ? '停止' : caption}</span> : null}
    </button>
  )
}
