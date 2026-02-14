/**
 * PlayerHUD - Bottom Center Game HUD
 * WoW-Style: 4 kleine Buttons + XP-Streifen + Wallet
 * Jeder Button öffnet ein volles Panel nach oben (wie die oberen Module)
 */

import { useState } from 'react'
import { FloatingCard } from './FloatingCard'

// ============================================================
// TYPEN
// ============================================================

type ActivePanel = 'wallet' | 'skills' | 'avatar' | 'log' | null
type LogFilter = 'alle' | 'quest' | 'offer' | 'need' | 'marktplatz' | 'trust'

interface LogEntry {
  id: string
  type: 'quest' | 'offer' | 'need' | 'marktplatz' | 'trust'
  text: string
  time: string
  xp?: number
  tokens?: number
}

interface SkillBranch {
  id: string
  label: string
  icon: string
  color: string
  level: number
  maxLevel: number
  skills: SkillNode[]
}

interface SkillNode {
  id: string
  label: string
  level: number
  maxLevel: number
  unlocked: boolean
}

interface Transaction {
  id: string
  type: 'in' | 'out'
  text: string
  amount: number
  time: string
}

// ============================================================
// DEMO DATEN (aus wir-sind-wertvoll game docs)
// ============================================================

// XP Formel: 100 × level^1.5
const PLAYER_LEVEL = 7
const XP_FOR_LEVEL = (lvl: number) => Math.round(100 * Math.pow(lvl, 1.5))
const CURRENT_XP = 1240
const XP_TO_NEXT = XP_FOR_LEVEL(PLAYER_LEVEL + 1)
const XP_FROM_PREV = XP_FOR_LEVEL(PLAYER_LEVEL)

const DEMO_LOG: LogEntry[] = [
  { id: '1', type: 'quest', text: 'Quest abgeschlossen: Gemeinschaftsgarten', time: 'vor 2h', xp: 120 },
  { id: '2', type: 'offer', text: 'Angebot eingestellt: Systemdenken-Workshop', time: 'vor 5h', xp: 30 },
  { id: '3', type: 'marktplatz', text: 'Tausch: Tomaten → Holz', time: 'gestern', tokens: 15 },
  { id: '4', type: 'need', text: 'Bedarf eingestellt: Grafikdesign', time: 'gestern', xp: 10 },
  { id: '5', type: 'trust', text: 'Anton hat dir vertraut', time: 'vor 3T', xp: 50 },
  { id: '6', type: 'quest', text: 'Quest gestartet: Repair Café', time: 'vor 4T' },
  { id: '7', type: 'offer', text: 'Angebot: Fahrradwerkstatt', time: 'vor 5T', xp: 25 },
  { id: '8', type: 'trust', text: 'Lena hat dir vertraut', time: 'vor 1W', xp: 50 },
  { id: '9', type: 'marktplatz', text: 'Verkauf: Kräuterpaket', time: 'vor 1W', tokens: 8 },
  { id: '10', type: 'quest', text: 'Quest: Nachbarschaftscafé', time: 'vor 2W', xp: 200 },
]

// 6 Skill-Branches aus den Game Docs
const DEMO_SKILLS: SkillBranch[] = [
  {
    id: 'natur', label: 'Naturverbundenheit', icon: '🌱', color: '#48bb78', level: 3, maxLevel: 5,
    skills: [
      { id: 'garten', label: 'Gartenarbeit', level: 3, maxLevel: 5, unlocked: true },
      { id: 'perma', label: 'Permakultur', level: 1, maxLevel: 5, unlocked: true },
      { id: 'tiere', label: 'Tierpflege', level: 2, maxLevel: 5, unlocked: true },
      { id: 'ernte', label: 'Ernte & Konservierung', level: 0, maxLevel: 5, unlocked: false },
    ]
  },
  {
    id: 'handwerk', label: 'Handwerk & Können', icon: '🔨', color: '#ed8936', level: 2, maxLevel: 5,
    skills: [
      { id: 'holz', label: 'Holzbearbeitung', level: 2, maxLevel: 5, unlocked: true },
      { id: 'reparatur', label: 'Reparieren', level: 3, maxLevel: 5, unlocked: true },
      { id: 'naehen', label: 'Nähen & Textil', level: 0, maxLevel: 5, unlocked: false },
      { id: 'bauen', label: 'Bauen & Konstruieren', level: 1, maxLevel: 5, unlocked: true },
    ]
  },
  {
    id: 'wissen', label: 'Wissen & Verstehen', icon: '📚', color: '#667eea', level: 4, maxLevel: 5,
    skills: [
      { id: 'system', label: 'Systemdenken', level: 4, maxLevel: 5, unlocked: true },
      { id: 'strategie', label: 'Strategie', level: 3, maxLevel: 5, unlocked: true },
      { id: 'forschung', label: 'Recherche', level: 2, maxLevel: 5, unlocked: true },
      { id: 'lehre', label: 'Lehren & Teilen', level: 3, maxLevel: 5, unlocked: true },
    ]
  },
  {
    id: 'gemeinschaft', label: 'Gemeinschaft', icon: '🤝', color: '#9f7aea', level: 4, maxLevel: 5,
    skills: [
      { id: 'moderation', label: 'Moderation', level: 2, maxLevel: 5, unlocked: true },
      { id: 'konflikt', label: 'Konfliktlösung', level: 1, maxLevel: 5, unlocked: true },
      { id: 'vernetzung', label: 'Vernetzung', level: 4, maxLevel: 5, unlocked: true },
      { id: 'fuehrung', label: 'Führung', level: 2, maxLevel: 5, unlocked: true },
    ]
  },
  {
    id: 'kreativ', label: 'Kreativität', icon: '🎨', color: '#f687b3', level: 2, maxLevel: 5,
    skills: [
      { id: 'design', label: 'Design', level: 2, maxLevel: 5, unlocked: true },
      { id: 'musik', label: 'Musik', level: 0, maxLevel: 5, unlocked: false },
      { id: 'schreiben', label: 'Schreiben', level: 3, maxLevel: 5, unlocked: true },
      { id: 'foto', label: 'Fotografie', level: 1, maxLevel: 5, unlocked: true },
    ]
  },
  {
    id: 'achtsamkeit', label: 'Achtsamkeit & Selbst', icon: '🧘', color: '#38b2ac', level: 1, maxLevel: 5,
    skills: [
      { id: 'meditation', label: 'Meditation', level: 1, maxLevel: 5, unlocked: true },
      { id: 'gesundheit', label: 'Gesundheit', level: 2, maxLevel: 5, unlocked: true },
      { id: 'refl', label: 'Reflexion', level: 1, maxLevel: 5, unlocked: true },
      { id: 'grenzen', label: 'Grenzen setzen', level: 0, maxLevel: 5, unlocked: false },
    ]
  },
]

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'in', text: 'Quest: Gemeinschaftsgarten', amount: 120, time: 'vor 2h' },
  { id: '2', type: 'in', text: 'Tausch: Tomaten → Holz', amount: 15, time: 'gestern' },
  { id: '3', type: 'out', text: 'Kauf: Saatgut-Paket', amount: 30, time: 'gestern' },
  { id: '4', type: 'in', text: 'Marktplatz: Kräuterpaket', amount: 8, time: 'vor 1W' },
  { id: '5', type: 'out', text: 'Leih: Werkzeugbox', amount: 5, time: 'vor 1W' },
  { id: '6', type: 'in', text: 'Angebot: Fahrradwerkstatt', amount: 25, time: 'vor 5T' },
]

const WALLET_BALANCE = 5133 // Personal token balance

// ============================================================
// LOG TYPE STYLES
// ============================================================

const LOG_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  quest: { bg: '#fef3c7', text: '#92400e', label: 'Quest' },
  offer: { bg: '#d1fae5', text: '#065f46', label: 'Angebot' },
  need: { bg: '#dbeafe', text: '#1e3a8a', label: 'Bedarf' },
  marktplatz: { bg: '#ffedd5', text: '#7c2d12', label: 'Markt' },
  trust: { bg: '#ede9fe', text: '#4c1d95', label: 'Vertrauen' },
}

// ============================================================
// SUB-KOMPONENTEN: Panels
// ============================================================

function WalletPanel() {
  const income = DEMO_TRANSACTIONS.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const expense = DEMO_TRANSACTIONS.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)

  return (
    <div style={{ width: 280 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet</p>
        {/* Kontostand */}
        <div className="mt-2 flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-900">{WALLET_BALANCE.toLocaleString('de')}</span>
          <span className="text-sm text-gray-500 mb-0.5">Timo-Token</span>
        </div>
        {/* Mini Stats */}
        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-green-600">+{income}</span>
            <span className="text-xs text-gray-400">diese Woche</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-red-500">-{expense}</span>
            <span className="text-xs text-gray-400">ausgegeben</span>
          </div>
        </div>
      </div>

      {/* Transaktionen */}
      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
        {DEMO_TRANSACTIONS.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              style={{
                backgroundColor: tx.type === 'in' ? '#d1fae5' : '#fee2e2',
              }}
            >
              {tx.type === 'in' ? '↑' : '↓'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 truncate">{tx.text}</p>
              <p className="text-xs text-gray-400">{tx.time}</p>
            </div>
            <span
              className="text-xs font-semibold flex-shrink-0"
              style={{ color: tx.type === 'in' ? '#059669' : '#dc2626' }}
            >
              {tx.type === 'in' ? '+' : '-'}{tx.amount}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-3 flex gap-2">
        <button className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition-colors" style={{ backgroundColor: '#667eea' }}>
          Senden
        </button>
        <button className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Empfangen
        </button>
      </div>
    </div>
  )
}

function SkillsPanel() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const branch = selectedBranch ? DEMO_SKILLS.find(b => b.id === selectedBranch) : null

  return (
    <div style={{ width: 320 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fähigkeitenbaum</p>
          {selectedBranch && (
            <button
              onClick={() => setSelectedBranch(null)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Zurück
            </button>
          )}
        </div>
      </div>

      {/* Inhalt: Branch Übersicht oder Detail */}
      {!branch ? (
        // 6 Branches als Grid
        <div className="p-3 grid grid-cols-2 gap-2">
          {DEMO_SKILLS.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className="flex flex-col items-start p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-lg">{b.icon}</span>
                <span className="text-xs font-semibold" style={{ color: b.color }}>Lv.{b.level}</span>
              </div>
              <p className="text-xs font-medium text-gray-700 leading-tight mb-2">{b.label}</p>
              {/* Skill-Level Dots */}
              <div className="flex gap-1">
                {Array.from({ length: b.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full border transition-all"
                    style={{
                      backgroundColor: i < b.level ? b.color : 'transparent',
                      borderColor: i < b.level ? b.color : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Branch Detail
        <div>
          {/* Branch Header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${branch.color}15, ${branch.color}05)` }}
          >
            <span className="text-2xl">{branch.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{branch.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex gap-1">
                  {Array.from({ length: branch.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: i < branch.level ? branch.color : '#e2e8f0',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: branch.color }}>Level {branch.level}</span>
              </div>
            </div>
          </div>

          {/* Skills im Branch */}
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {branch.skills.map(skill => (
              <div
                key={skill.id}
                className="px-4 py-3 border-b border-gray-50"
                style={{ opacity: skill.unlocked ? 1 : 0.4 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {!skill.unlocked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    )}
                    <span className="text-xs font-medium text-gray-700">{skill.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {skill.unlocked ? `Lv.${skill.level}` : 'Gesperrt'}
                  </span>
                </div>
                {skill.unlocked && (
                  <div className="flex gap-1">
                    {Array.from({ length: skill.maxLevel }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-all"
                        style={{
                          backgroundColor: i < skill.level ? branch.color : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AvatarPanel() {
  const xpProgress = ((CURRENT_XP - XP_FROM_PREV) / (XP_TO_NEXT - XP_FROM_PREV)) * 100
  const levelLabel = PLAYER_LEVEL <= 10 ? 'Einsteiger' :
    PLAYER_LEVEL <= 25 ? 'Entdecker' :
    PLAYER_LEVEL <= 50 ? 'Spezialist' :
    PLAYER_LEVEL <= 75 ? 'Experte' :
    PLAYER_LEVEL <= 100 ? 'Mentor' : 'Legende'

  return (
    <div style={{ width: 260 }}>
      {/* Avatar Header */}
      <div
        className="px-4 pt-5 pb-4 text-center"
        style={{ background: 'linear-gradient(135deg, #667eea20, #764ba215)' }}
      >
        <div className="relative inline-block mb-3">
          <div
            className="w-16 h-16 rounded-full overflow-hidden shadow-md mx-auto"
            style={{ border: '3px solid #667eea' }}
          >
            <img
              src="https://ui-avatars.com/api/?name=T&background=667eea&color=fff&size=128&bold=true"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
            style={{ backgroundColor: '#48bb78' }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <p className="text-sm font-bold text-gray-900">Timo</p>
        <p className="text-xs text-gray-500 mt-0.5">Berlin, Prenzlauer Berg</p>

        {/* Level Badge */}
        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#667eea', color: 'white' }}>
          <span>Level {PLAYER_LEVEL}</span>
          <span className="opacity-70">·</span>
          <span>{levelLabel}</span>
        </div>
      </div>

      {/* XP Detail */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-600">Erfahrungspunkte</span>
          <span className="text-xs text-gray-500">{CURRENT_XP} / {XP_TO_NEXT} XP</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${xpProgress}%`,
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{XP_TO_NEXT - CURRENT_XP} XP bis Level {PLAYER_LEVEL + 1}</p>
      </div>

      {/* Skill Übersicht kompakt */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Fähigkeiten</p>
        <div className="space-y-1.5">
          {DEMO_SKILLS.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center gap-2">
              <span className="text-sm">{b.icon}</span>
              <span className="text-xs text-gray-600 flex-1">{b.label}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: b.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: i < b.level ? b.color : '#e2e8f0' }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 w-6 text-right">Lv.{b.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Score */}
      <div className="px-4 pb-4">
        <div
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: '#f5f3ff' }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-xs font-medium text-purple-700">Vertrauensstufe</span>
          </div>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i <= 3 ? '#7c3aed' : '#e2e8f0' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LogPanel() {
  const [filter, setFilter] = useState<LogFilter>('alle')

  const filteredLog = DEMO_LOG.filter(e => filter === 'alle' || e.type === filter)

  const filterLabels: Record<LogFilter, string> = {
    alle: 'Alle',
    quest: 'Quests',
    offer: 'Angebote',
    need: 'Bedarfe',
    marktplatz: 'Markt',
    trust: 'Vertrauen',
  }

  return (
    <div style={{ width: 300 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aktivitäts-Log</p>
        {/* Filter Pills */}
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(filterLabels) as LogFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? '#1f2937' : '#f3f4f6',
                color: filter === f ? 'white' : '#6b7280',
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Log Einträge */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {filteredLog.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400">Keine Einträge</p>
          </div>
        ) : (
          filteredLog.map(entry => {
            const s = LOG_STYLE[entry.type]
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                {/* Type Badge */}
                <div
                  className="mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {s.label}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-snug">{entry.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{entry.time}</span>
                    {entry.xp && (
                      <span className="text-xs font-semibold" style={{ color: '#667eea' }}>+{entry.xp} XP</span>
                    )}
                    {entry.tokens && (
                      <span className="text-xs font-semibold text-amber-600">+{entry.tokens} Token</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================
// HAUPT-KOMPONENTE
// ============================================================

// ModuleId muss mit AppClean übereinstimmen
type ModuleId = 'profil' | 'kalender' | 'feed' | 'marktplatz' | 'quest' | 'wertschoepfung' | 'wallet' | 'skills' | 'avatar' | 'log'

interface HudButton {
  id: NonNullable<ActivePanel>
  moduleId: ModuleId
  icon: React.ReactNode
  label: string
  color: string
}

interface PlayerHUDProps {
  onOpenModule?: (moduleId: ModuleId) => void
}

export function PlayerHUD({ onOpenModule }: PlayerHUDProps) {
  // Lokales Panel als Fallback wenn kein onOpenModule übergeben
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const xpProgress = ((CURRENT_XP - XP_FROM_PREV) / (XP_TO_NEXT - XP_FROM_PREV)) * 100

  const togglePanel = (panel: NonNullable<ActivePanel>, moduleId: ModuleId) => {
    if (onOpenModule) {
      // Kachel öffnen/schließen über App
      onOpenModule(moduleId)
    } else {
      // Fallback: lokales Panel
      setActivePanel(prev => prev === panel ? null : panel)
    }
  }

  const HUD_BUTTONS: HudButton[] = [
    {
      id: 'wallet',
      moduleId: 'wallet',
      label: 'Wallet',
      color: '#f59e0b',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M16 12h.01"/>
          <path d="M2 10h20"/>
        </svg>
      ),
    },
    {
      id: 'skills',
      moduleId: 'skills',
      label: 'Fähigkeiten',
      color: '#667eea',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
    },
    {
      id: 'avatar',
      moduleId: 'avatar',
      label: 'Profil',
      color: '#48bb78',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      id: 'log',
      moduleId: 'log',
      label: 'Log',
      color: '#9f7aea',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
  ]

  const renderPanel = () => {
    if (!activePanel) return null
    switch (activePanel) {
      case 'wallet': return <WalletPanel />
      case 'skills': return <SkillsPanel />
      case 'avatar': return <AvatarPanel />
      case 'log': return <LogPanel />
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* === PANEL (öffnet sich nach oben) === */}
      {activePanel && (
        <FloatingCard padding="none" backgroundOpacity={98} shadow="large" rounded="large">
          {renderPanel()}
        </FloatingCard>
      )}

      {/* === HUD STREIFEN === */}
      <FloatingCard padding="none" backgroundOpacity={97} rounded="large">
        <div className="flex items-center gap-1 px-3 py-2">

          {/* XP Streifen links */}
          <div className="flex items-center gap-2 mr-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: '#667eea', fontSize: '10px' }}>XP</span>
                <span className="text-xs text-gray-500" style={{ fontSize: '10px' }}>{CURRENT_XP}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ width: 64 }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress}%`,
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  }}
                />
              </div>
            </div>
            {/* Level Badge */}
            <div
              className="px-1.5 py-0.5 rounded-md text-white font-bold"
              style={{ backgroundColor: '#667eea', fontSize: '10px' }}
            >
              Lv.{PLAYER_LEVEL}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 mx-1" />

          {/* 4 Buttons */}
          {HUD_BUTTONS.map(btn => {
            const isActive = !onOpenModule && activePanel === btn.id
            return (
              <button
                key={btn.id}
                onClick={() => togglePanel(btn.id, btn.moduleId)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                title={btn.label}
                style={{
                  backgroundColor: isActive ? btn.color : 'transparent',
                  color: isActive ? 'white' : '#9ca3af',
                  border: `2px solid ${isActive ? btn.color : '#e5e7eb'}`,
                }}
              >
                {btn.icon}
              </button>
            )
          })}

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 mx-1" />

          {/* Wallet Betrag rechts */}
          <div className="flex items-center gap-1 ml-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-xs font-bold text-gray-800" style={{ fontSize: '11px' }}>
              {WALLET_BALANCE.toLocaleString('de')}
            </span>
          </div>

        </div>
      </FloatingCard>
    </div>
  )
}
