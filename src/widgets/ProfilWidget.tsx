/**
 * Profil-Widget - Modernes Community-Profil
 * - Bild, Name, Ort, Kontakt
 * - Offers (Begabungen) & Needs (Bedürfnisse) als Hashtag-System
 * - Klickbare Hashtags → Filter auf Karte
 * - Web of Trust Verknüpfungen
 */

import { useState } from 'react'

type HashtagCategory = 'offer' | 'need'

interface Hashtag {
  id: string
  label: string
  category: HashtagCategory
  count?: number // wie viele im Netzwerk haben das auch
}

interface ProfilWidgetProps {
  onHashtagClick?: (tag: string, category: HashtagCategory) => void
}

// Demo-Daten
const DEMO_OFFERS: Hashtag[] = [
  { id: 'systemdenken', label: 'Systemdenken', category: 'offer', count: 12 },
  { id: 'vision', label: 'Vision & Strategie', category: 'offer', count: 8 },
  { id: 'kommunikation', label: 'Kommunikation', category: 'offer', count: 24 },
  { id: 'moderation', label: 'Moderation', category: 'offer', count: 7 },
  { id: 'permakultur', label: 'Permakulturgarten', category: 'offer', count: 5 },
  { id: 'coding', label: 'Coding', category: 'offer', count: 3 },
]

const DEMO_NEEDS: Hashtag[] = [
  { id: 'webentwicklung', label: 'Webentwicklung', category: 'need', count: 15 },
  { id: 'grafikdesign', label: 'Grafik & Design', category: 'need', count: 9 },
  { id: 'buchaltung', label: 'Buchhaltung', category: 'need', count: 4 },
  { id: 'rechtliches', label: 'Rechtliches', category: 'need', count: 6 },
]

export function ProfilWidget({ onHashtagClick }: ProfilWidgetProps) {
  const [activeTab, setActiveTab] = useState<'profil' | 'offers' | 'needs' | 'trust'>('profil')
  const [editMode, setEditMode] = useState(false)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* === HEADER: Avatar + Name + Tabs === */}
      <div className="flex-shrink-0">

        {/* Cover / Gradient */}
        <div
          className="h-20 w-full"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        />

        {/* Avatar + Basis-Info */}
        <div className="px-5 pb-3">
          <div className="flex items-end justify-between -mt-8 mb-3">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl border-3 border-white shadow-md overflow-hidden bg-gray-100"
                style={{ border: '3px solid white' }}
              >
                <img
                  src="https://ui-avatars.com/api/?name=T&background=667eea&color=fff&size=128&bold=true"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Trust-Badge */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white flex items-center justify-center"
                title="Verifiziert im Web of Trust"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M20 6L9 17l-5-5"/>
                  <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {editMode ? 'Speichern' : 'Bearbeiten'}
            </button>
          </div>

          {/* Name + Rolle */}
          <div className="mb-1">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Timo</h2>
            <p className="text-sm text-gray-500">Visionär · Pionier · Community Builder</p>
          </div>

          {/* Ort */}
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Berlin, Deutschland</span>
          </div>

          {/* Stats-Zeile */}
          <div className="flex gap-4 text-center mb-3">
            <div>
              <div className="text-sm font-bold text-gray-900">6</div>
              <div className="text-xs text-gray-400">Begabungen</div>
            </div>
            <div className="w-px bg-gray-100"/>
            <div>
              <div className="text-sm font-bold text-gray-900">4</div>
              <div className="text-xs text-gray-400">Bedürfnisse</div>
            </div>
            <div className="w-px bg-gray-100"/>
            <div>
              <div className="text-sm font-bold text-gray-900">24</div>
              <div className="text-xs text-gray-400">Verbindungen</div>
            </div>
            <div className="w-px bg-gray-100"/>
            <div>
              <div className="text-sm font-bold text-green-600">3</div>
              <div className="text-xs text-gray-400">Trust-Level</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-3">
          {[
            { id: 'profil', label: 'Profil' },
            { id: 'offers', label: 'Begabungen' },
            { id: 'needs', label: 'Bedürfnisse' },
            { id: 'trust', label: 'Vertrauen' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* === CONTENT: Tab-Inhalt === */}
      <div className="flex-1 overflow-y-auto">

        {/* --- TAB: PROFIL --- */}
        {activeTab === 'profil' && (
          <div className="p-4 space-y-4">

            {/* Bio */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Über mich</h4>
              {editMode ? (
                <textarea
                  defaultValue="Ich baue Werkzeuge für echte Gemeinschaft. Systemdenker, Visionär und leidenschaftlicher Gärtner."
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2 resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  Ich baue Werkzeuge für echte Gemeinschaft. Systemdenker, Visionär und leidenschaftlicher Gärtner.
                </p>
              )}
            </div>

            {/* Kontakt */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kontakt</h4>
              <div className="space-y-2">

                {/* Telegram */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    {/* Telegram Icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8.02c-.12.58-.46.72-.93.44l-2.57-1.9-1.24 1.2c-.14.13-.25.25-.51.25l.18-2.6 4.72-4.26c.21-.18-.04-.28-.32-.1L7.43 14.5 4.9 13.7c-.56-.18-.57-.56.12-.83l8.91-3.44c.47-.17.88.11.71.37z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">Telegram</div>
                    <div className="text-sm font-medium text-gray-800">@timo_beispiel</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>

                {/* Signal */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">Signal</div>
                    <div className="text-sm font-medium text-gray-800">+49 xxx</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>

                {/* Standort */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">Wohnort</div>
                    <div className="text-sm font-medium text-gray-800">Berlin Prenzlauer Berg</div>
                  </div>
                  <button className="text-xs text-blue-500 font-medium">Karte</button>
                </div>
              </div>
            </div>

            {/* Web of Trust Public Key */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Web of Trust</h4>
              <div className="p-2.5 rounded-xl bg-gray-50 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400">Öffentlicher Schlüssel</div>
                  <div className="text-xs font-mono text-gray-600 truncate">npub1abc...xyz789</div>
                </div>
                <button className="text-xs text-blue-500 font-medium flex-shrink-0">Kopieren</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: OFFERS (Begabungen) --- */}
        {activeTab === 'offers' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Was ich anbiete</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Klicke auf einen Hashtag um auf der Karte zu suchen</p>
                </div>
                {editMode && (
                  <button className="text-xs text-blue-500 font-medium">+ Hinzufügen</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_OFFERS.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onHashtagClick?.(tag.label, 'offer')}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                      bg-green-50 text-green-700 border border-green-200
                      hover:bg-green-100 hover:border-green-300
                      transition-all duration-150"
                  >
                    <span className="text-green-400 text-xs">#</span>
                    {tag.label}
                    {tag.count && (
                      <span className="text-xs text-green-400 font-normal">{tag.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-green-50 border border-green-100">
              <p className="text-xs text-green-700 leading-relaxed">
                Deine Begabungen sind sichtbar für alle im Netzwerk.
                Andere können dich über diese Hashtags finden und kontaktieren.
              </p>
            </div>
          </div>
        )}

        {/* --- TAB: NEEDS (Bedürfnisse) --- */}
        {activeTab === 'needs' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Was ich brauche</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Finde Menschen die helfen können</p>
                </div>
                {editMode && (
                  <button className="text-xs text-blue-500 font-medium">+ Hinzufügen</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_NEEDS.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onHashtagClick?.(tag.label, 'need')}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                      bg-blue-50 text-blue-700 border border-blue-200
                      hover:bg-blue-100 hover:border-blue-300
                      transition-all duration-150"
                  >
                    <span className="text-blue-400 text-xs">#</span>
                    {tag.label}
                    {tag.count && (
                      <span className="text-xs text-blue-400 font-normal">{tag.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                Deine Bedürfnisse helfen dem Netzwerk zu verstehen, wie es dir helfen kann.
                Auch andere haben vielleicht dieselben Bedürfnisse.
              </p>
            </div>
          </div>
        )}

        {/* --- TAB: TRUST (Vertrauen) --- */}
        {activeTab === 'trust' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Trust Level 3</h4>
              <p className="text-xs text-gray-400 mb-3">Verifiziert durch 3 Personen im Web of Trust</p>

              {/* Trust-Meter */}
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full ${level <= 3 ? 'bg-green-400' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>

            {/* Vertraut von */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vertraut von</h4>
              <div className="space-y-2">
                {['Anton', 'Tillmann', 'Sara'].map((name) => (
                  <div key={name} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                    <img
                      src={`https://ui-avatars.com/api/?name=${name}&size=64&background=random&bold=true`}
                      alt={name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{name}</div>
                      <div className="text-xs text-gray-400">Trust Level 4</div>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-700 leading-relaxed">
                Im Real Life Stack basiert Vertrauen auf echten Begegnungen.
                Höheres Trust Level = mehr Sichtbarkeit im Netzwerk.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
