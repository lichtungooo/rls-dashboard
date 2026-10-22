/**
 * EliMascot — Maskottchen-Assistent
 *
 * Kleiner Kopf, der unten rechts aus dem Bildschirmrand guckt.
 * Klick → Chat-Bubble mit Begrüßung, Tipps und Tour.
 * Jeder Space kann ein eigenes Maskottchen haben (Eli = Default).
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Maskottchen-Typen ──────────────────────────────────────

interface MascotConfig {
  name: string
  emoji: string
  color: string
  greeting: string
}

const MASCOTS: Record<string, MascotConfig> = {
  eli: {
    name: 'Eli',
    emoji: '🦉',
    color: '#8b5cf6',
    greeting: 'Hallo! Ich bin Eli, dein Assistent im Real Life Stack.',
  },
  honu: {
    name: 'Honu',
    emoji: '🐢',
    color: '#059669',
    greeting: 'Aloha! Ich bin Honu, die Schildkröte der Maluhea-Friedenscharta.',
  },
}

// ── Chat-Nachrichten ───────────────────────────────────────

interface ChatMessage {
  id: number
  text: string
  isEli: boolean
  actions?: { label: string; action: string }[]
}

const WELCOME_FLOW: ChatMessage[] = [
  {
    id: 1,
    text: 'Hallo! Ich bin Eli, dein Assistent im Real Life Stack. Schön, dass du da bist! 🌱',
    isEli: true,
  },
  {
    id: 2,
    text: 'Wie geht es dir heute?',
    isEli: true,
    actions: [
      { label: '😊 Gut!', action: 'good' },
      { label: '😐 Geht so', action: 'ok' },
      { label: '🚀 Bereit loszulegen!', action: 'ready' },
    ],
  },
]

const AFTER_GREETING: Record<string, ChatMessage[]> = {
  good: [
    { id: 10, text: '😊 Gut!', isEli: false },
    { id: 11, text: 'Das freut mich! Magst du eine kleine Tour durch die App machen? Ich zeig dir, was du alles kannst.', isEli: true, actions: [
      { label: '👀 Ja, zeig mal!', action: 'tour' },
      { label: '🔍 Ich schau mich selbst um', action: 'explore' },
    ]},
  ],
  ok: [
    { id: 10, text: '😐 Geht so', isEli: false },
    { id: 11, text: 'Kein Stress! Ich bin hier, wenn du mich brauchst. Schau dich erstmal um — oder soll ich dir zeigen, was du machen kannst?', isEli: true, actions: [
      { label: '👀 Zeig mal!', action: 'tour' },
      { label: '✌️ Passt schon', action: 'explore' },
    ]},
  ],
  ready: [
    { id: 10, text: '🚀 Bereit loszulegen!', isEli: false },
    { id: 11, text: 'Super Energie! Dann lass uns direkt starten — ich zeig dir die wichtigsten Features!', isEli: true, actions: [
      { label: '🎯 Los geht\'s!', action: 'tour' },
    ]},
  ],
}

const TOUR_STEPS: { target: string; text: string }[] = [
  { target: 'nav-modules', text: '👆 Hier oben findest du deine Module — Kalender, Marktplatz, Profil und mehr. Klick einfach drauf, um eine Kachel zu öffnen!' },
  { target: 'layer-switcher', text: '👉 Rechts kannst du die Kartenansicht wechseln — von Normal über Satellit bis zum 3D-Globus!' },
  { target: 'trust-button', text: '🕸️ Das Web of Trust zeigt dir das Vertrauensnetzwerk — wer hat wen onboarded?' },
  { target: 'quick-actions', text: '➕ Mit "Neu" kannst du dein Profil auf die Karte setzen, Events erstellen und mehr!' },
  { target: 'player-hud', text: '🎮 Unten ist dein Player-HUD — Wallet, Skills, Avatar und dein Aktivitätslog.' },
]

// ── Props ──────────────────────────────────────────────────

interface EliMascotProps {
  spaceMascot?: string
  onHighlight?: (target: string | null) => void
}

// ── Komponente ─────────────────────────────────────────────

export function EliMascot({ spaceMascot = 'eli', onHighlight }: EliMascotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [tourStep, setTourStep] = useState(-1)
  const [bounceCount, setBounceCount] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const mascot = MASCOTS[spaceMascot] || MASCOTS.eli

  // Auto-scroll zum neuesten Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Anfangs-Bounce (Aufmerksamkeit erregen)
  useEffect(() => {
    if (hasGreeted) return
    const interval = setInterval(() => {
      setBounceCount(c => {
        if (c >= 3) { clearInterval(interval); return c }
        return c + 1
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [hasGreeted])

  // Chat öffnen und Begrüßung starten
  const handleOpen = useCallback(() => {
    setIsOpen(true)
    if (!hasGreeted) {
      setHasGreeted(true)
      // Nachrichten nacheinander "tippen"
      setIsTyping(true)
      setTimeout(() => {
        setMessages([WELCOME_FLOW[0]])
        setIsTyping(false)
        setTimeout(() => {
          setIsTyping(true)
          setTimeout(() => {
            setMessages(prev => [...prev, WELCOME_FLOW[1]])
            setIsTyping(false)
          }, 800)
        }, 500)
      }, 600)
    }
  }, [hasGreeted])

  // Action-Button im Chat
  const handleAction = useCallback((action: string) => {
    if (action === 'tour') {
      // Tour starten
      const tourMsg: ChatMessage = { id: 100, text: 'Alles klar! Ich markiere dir die wichtigen Bereiche. Schau mal...', isEli: true }
      setIsTyping(true)
      setTimeout(() => {
        setMessages(prev => [...prev, tourMsg])
        setIsTyping(false)
        // Ersten Tour-Schritt starten
        setTimeout(() => startTourStep(0), 800)
      }, 600)
      return
    }

    if (action === 'explore') {
      const exploreMsg: ChatMessage = { id: 100, text: 'Klar! Ich bin hier unten, wenn du Fragen hast. Klick mich einfach an! 👋', isEli: true }
      setIsTyping(true)
      setTimeout(() => {
        setMessages(prev => [...prev, exploreMsg])
        setIsTyping(false)
      }, 600)
      return
    }

    // Greeting-Antwort
    const followUp = AFTER_GREETING[action]
    if (followUp) {
      // User-Antwort sofort anzeigen
      setMessages(prev => [...prev, followUp[0]])
      // Eli-Antwort getippt
      setIsTyping(true)
      setTimeout(() => {
        setMessages(prev => [...prev, followUp[1]])
        setIsTyping(false)
      }, 800)
    }
  }, [])

  // Tour-Schritt
  const startTourStep = useCallback((step: number) => {
    if (step >= TOUR_STEPS.length) {
      // Tour beendet
      setTourStep(-1)
      onHighlight?.(null)
      const endMsg: ChatMessage = { id: 200, text: 'Das war\'s! Du kennst jetzt die wichtigsten Features. Viel Spaß beim Entdecken! 🌟', isEli: true }
      setMessages(prev => [...prev, endMsg])
      return
    }

    const tourData = TOUR_STEPS[step]
    setTourStep(step)
    onHighlight?.(tourData.target)

    const tourMsg: ChatMessage = {
      id: 150 + step,
      text: tourData.text,
      isEli: true,
      actions: step < TOUR_STEPS.length - 1
        ? [{ label: 'Weiter →', action: `tour-${step + 1}` }]
        : [{ label: '✅ Fertig!', action: 'tour-end' }],
    }
    setIsTyping(true)
    setTimeout(() => {
      setMessages(prev => [...prev, tourMsg])
      setIsTyping(false)
    }, 500)
  }, [onHighlight])

  // Tour-Navigation
  const handleTourAction = useCallback((action: string) => {
    if (action === 'tour-end') {
      startTourStep(TOUR_STEPS.length) // Beendet die Tour
      return
    }
    const match = action.match(/^tour-(\d+)$/)
    if (match) {
      startTourStep(parseInt(match[1]))
    }
  }, [startTourStep])

  // Allgemeiner Action-Handler
  const onAction = useCallback((action: string) => {
    if (action.startsWith('tour')) {
      handleTourAction(action)
    } else {
      handleAction(action)
    }
  }, [handleAction, handleTourAction])

  return (
    <>
      {/* ── Maskottchen-Kopf (guckt aus dem Rand) ────────── */}
      <div
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        style={{
          position: 'fixed',
          bottom: isOpen ? 12 : -8,
          right: 140,
          zIndex: 55,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: `translateY(${!isOpen && bounceCount > 0 ? 'calc(-6px)' : '0px'})`,
          animation: !hasGreeted && bounceCount > 0 ? 'eli-bounce 0.6s ease' : 'none',
        }}
        title={isOpen ? 'Chat schließen' : `${mascot.name} öffnen`}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${mascot.color}, ${mascot.color}dd)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          boxShadow: isOpen
            ? `0 4px 20px ${mascot.color}60, 0 0 0 3px white`
            : `0 4px 16px ${mascot.color}40`,
          border: '3px solid white',
          transition: 'all 0.2s ease',
        }}>
          {mascot.emoji}
        </div>

        {/* Notification-Dot wenn noch nicht gegrüßt */}
        {!hasGreeted && (
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid white',
            animation: 'eli-pulse 2s infinite',
          }} />
        )}
      </div>

      {/* ── Chat-Bubble ──────────────────────────────────── */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 68,
          right: 100,
          width: 320,
          maxHeight: 420,
          zIndex: 55,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          borderRadius: 16,
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'eli-slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: `linear-gradient(135deg, ${mascot.color}08, ${mascot.color}15)`,
          }}>
            <span style={{ fontSize: 20 }}>{mascot.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', fontFamily: 'system-ui, sans-serif' }}>
                {mascot.name}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>
                {tourStep >= 0 ? `Tour: Schritt ${tourStep + 1}/${TOUR_STEPS.length}` : 'Dein Assistent'}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          {/* Chat-Nachrichten */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 200,
            maxHeight: 320,
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isEli ? 'flex-start' : 'flex-end',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: msg.isEli ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                  background: msg.isEli ? '#f3f4f6' : mascot.color,
                  color: msg.isEli ? '#374151' : 'white',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {msg.text}
                </div>

                {/* Action-Buttons */}
                {msg.actions && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginTop: 6,
                  }}>
                    {msg.actions.map((act) => (
                      <button
                        key={act.action}
                        onClick={() => onAction(act.action)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1.5px solid ${mascot.color}40`,
                          background: 'white',
                          color: mascot.color,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'system-ui, sans-serif',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = mascot.color
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white'
                          e.currentTarget.style.color = mascot.color
                        }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing-Indikator */}
            {isTyping && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                background: '#f3f4f6',
                borderRadius: '12px 12px 12px 4px',
                width: 'fit-content',
              }}>
                <span style={{ animation: 'eli-dot 1.4s infinite 0s', fontSize: 18, color: '#9ca3af' }}>.</span>
                <span style={{ animation: 'eli-dot 1.4s infinite 0.2s', fontSize: 18, color: '#9ca3af' }}>.</span>
                <span style={{ animation: 'eli-dot 1.4s infinite 0.4s', fontSize: 18, color: '#9ca3af' }}>.</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* ── CSS-Animationen ──────────────────────────────── */}
      <style>{`
        @keyframes eli-bounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
          60% { transform: translateY(-4px); }
        }
        @keyframes eli-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes eli-slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes eli-dot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}
