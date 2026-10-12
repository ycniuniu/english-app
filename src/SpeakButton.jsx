import { SpeakerIcon, StopIcon } from './icons.jsx'
import { speakText, stopSpeech, useSpeech } from './speech.js'

export function SpeakButton({ text, id, rate, label = '朗读这句', compact = false, lang = 'en-US' }) {
  const speech = useSpeech()
  const active = speech.status === 'speaking' && speech.id === id
  const className = compact ? 'speak tiny' : 'speak'

  return (
    <button
      type="button"
      className={active ? `${className} on` : className}
      aria-label={active ? '停止朗读' : label}
      aria-pressed={active}
      onClick={() => {
        if (active) stopSpeech()
        else speakText(text, { id, rate, lang })
      }}
    >
      {active ? <StopIcon /> : <SpeakerIcon />}
    </button>
  )
}
