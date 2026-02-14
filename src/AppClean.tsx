/**
 * Clean Dashboard - Map + dynamisches Kachel-System
 * Kacheln öffnen sich von Modul-Nav (oben) und Player HUD (unten)
 * Jede Kachel: schließen + resize (1×1, 2×1, 1×2, 3×2)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FloatingCard } from './components/FloatingCard'
import { PlayerHUD } from './components/PlayerHUD'
import { ProfilWidget } from './widgets/ProfilWidget'
import { KalenderWidget } from './widgets/KalenderWidget'
import { FeedWidget } from './widgets/FeedWidget'
import { WalletTile, SkillsTile, AvatarTile, LogTile } from './components/HUDTiles'
import { generateTrustNetwork, TrustNetworkOverlay } from './components/TrustNetworkLayer'

// Icon-Fix für Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ============================================================
// TYPEN
// ============================================================

type ModuleId = 'profil' | 'kalender' | 'feed' | 'marktplatz' | 'quest' | 'wertschoepfung' | 'wallet' | 'skills' | 'avatar' | 'log'
type TileSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '3x2'
type MapLayer = 'normal' | 'satellit' | 'fantasy'
type TrustMode = 'all' | 'my'

interface Tile {
  id: string
  moduleId: ModuleId
  size: TileSize
}

// colspan und rowspan pro Größe
const TILE_SPAN: Record<TileSize, { col: number; row: number }> = {
  '1x1': { col: 1, row: 1 },
  '2x1': { col: 2, row: 1 },
  '1x2': { col: 1, row: 2 },
  '2x2': { col: 2, row: 2 },
  '3x1': { col: 3, row: 1 },
  '3x2': { col: 3, row: 2 },
}

// Nächste Größe beim Vergrößern
const NEXT_SIZE: Record<TileSize, TileSize> = {
  '1x1': '2x1',
  '2x1': '2x2',
  '1x2': '2x2',
  '2x2': '3x2',
  '3x1': '3x2',
  '3x2': '1x1',
}

// Module-Metadaten
const MODULE_META: Record<ModuleId, { label: string; icon: string }> = {
  profil:        { label: 'Profil',        icon: '👤' },
  kalender:      { label: 'Kalender',      icon: '📅' },
  feed:          { label: 'Feed',          icon: '📰' },
  marktplatz:    { label: 'Marktplatz',    icon: '🛒' },
  quest:         { label: 'Quest',         icon: '⚔️' },
  wertschoepfung:{ label: 'Money',         icon: '💎' },
  wallet:        { label: 'Wallet',        icon: '💳' },
  skills:        { label: 'Fähigkeiten',   icon: '✦' },
  avatar:        { label: 'Avatar',        icon: '🎭' },
  log:           { label: 'Log',           icon: '📄' },
}

// Top-Navigation Module
const NAV_MODULES: ModuleId[] = ['kalender', 'marktplatz', 'profil', 'quest', 'wertschoepfung', 'feed']

// Kartenlagen
const MAP_LAYERS: Record<MapLayer, { url: string; attribution: string; maxZoom: number; label: string; icon: string; cssFilter?: string }> = {
  normal: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    label: 'Normal',
    icon: '🗺️',
  },
  satellit: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    label: 'Satellit',
    icon: '🛰️',
  },
  fantasy: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '&copy; Stamen Design, &copy; OpenStreetMap contributors',
    maxZoom: 16,
    label: 'Fantasy',
    icon: '🧙',
    cssFilter: 'sepia(40%) hue-rotate(-15deg) saturate(130%) brightness(0.92)',
  },
}

// ============================================================
// KACHEL-INHALT
// ============================================================

function TileContent({ moduleId, onHashtagClick }: { moduleId: ModuleId; onHashtagClick: (tag: string, cat: 'offer' | 'need') => void }) {
  switch (moduleId) {
    case 'profil':   return <ProfilWidget onHashtagClick={onHashtagClick} />
    case 'kalender': return <KalenderWidget />
    case 'feed':     return <FeedWidget />
    case 'wallet':   return <WalletTile />
    case 'skills':   return <SkillsTile />
    case 'avatar':   return <AvatarTile />
    case 'log':      return <LogTile />
    default:
      return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center gap-2">
          <span style={{ fontSize: '32px' }}>{MODULE_META[moduleId].icon}</span>
          <p className="text-sm font-medium text-gray-400">"{MODULE_META[moduleId].label}" kommt bald</p>
          <p className="text-xs text-gray-300">Dieses Modul ist in Entwicklung</p>
        </div>
      )
  }
}

// ============================================================
// KACHEL-KOPFZEILE (Titel + Resize + Schließen)
// ============================================================

function TileHeader({
  moduleId,
  size,
  onResize,
  onClose,
}: {
  moduleId: ModuleId
  size: TileSize
  onResize: () => void
  onClose: () => void
}) {
  const meta = MODULE_META[moduleId]
  const nextSize = NEXT_SIZE[size]
  const isMax = size === '3x2'

  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0"
      style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '14px' }}>{meta.icon}</span>
        <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
        <span className="text-xs text-gray-300 font-mono">{size}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onResize}
          title={isMax ? 'Verkleinern (1×1)' : `Vergrößern (${nextSize})`}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          {isMax ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
              <line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          )}
        </button>
        <button
          onClick={onClose}
          title="Kachel schließen"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============================================================
// WEB OF TRUST — Info-Leiste (wenn aktiv)
// ============================================================

function TrustInfoBar({ mode, onModeChange, onClose }: {
  mode: TrustMode
  onModeChange: (m: TrustMode) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 64,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
    }}>
      <FloatingCard padding="none" backgroundOpacity={97}>
        <div className="flex items-center gap-1 px-3 py-2">
          <span style={{ fontSize: '16px', marginRight: 4 }}>🕸️</span>
          <span className="text-xs font-semibold text-gray-600 mr-2">Web of Trust</span>

          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => onModeChange('all')}
              className="px-3 py-1 text-xs font-medium transition-all"
              style={{
                backgroundColor: mode === 'all' ? '#8b5cf6' : 'transparent',
                color: mode === 'all' ? 'white' : '#6b7280',
              }}
            >
              🌍 Alle (10.000)
            </button>
            <button
              onClick={() => onModeChange('my')}
              className="px-3 py-1 text-xs font-medium transition-all border-l border-gray-200"
              style={{
                backgroundColor: mode === 'my' ? '#f59e0b' : 'transparent',
                color: mode === 'my' ? 'white' : '#6b7280',
              }}
            >
              ⭐ Mein Netz
            </button>
          </div>

          <span className="text-xs text-gray-400 ml-2 hidden sm:block">Zoom raus → dickere Verbindungen</span>

          <button
            onClick={onClose}
            className="ml-2 w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </FloatingCard>
    </div>
  )
}

// ============================================================
// HAUPT APP
// ============================================================

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const moduleScrollRef = useRef<HTMLDivElement>(null)
  const trustOverlayRef = useRef<TrustNetworkOverlay | null>(null)

  const [tiles, setTiles] = useState<Tile[]>([])
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayer>('normal')
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Web of Trust State
  const [trustActive, setTrustActive] = useState(false)
  const [trustMode, setTrustMode] = useState<TrustMode>('all')

  // ────────────────────────────────────────────────────────
  // Leaflet Map Init
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize()
      return
    }
    try {
      const map = L.map(mapRef.current, {
        center: [52.52, 13.405],
        zoom: 13,
        zoomControl: false,
      })
      const layer = MAP_LAYERS.normal
      const tileLayer = L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: layer.maxZoom })
      tileLayer.addTo(map)
      tileLayerRef.current = tileLayer
      L.marker([52.52, 13.405]).addTo(map).bindPopup('<strong>🗺️ Real Life Stack</strong><br/>Community-Zentrale')
      L.marker([52.51, 13.38]).addTo(map).bindPopup('<strong>🌱 Gemeinschaftsgarten</strong><br/>Urban Gardening Treffpunkt')
      L.marker([52.53, 13.42]).addTo(map).bindPopup('<strong>🔧 Repair Café</strong><br/>Jeden Samstag 14-18 Uhr')
      mapInstanceRef.current = map
      setTimeout(() => { map.invalidateSize() }, 200)
    } catch (error) {
      console.error('❌ Error initializing map:', error)
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // ────────────────────────────────────────────────────────
  // Web of Trust Overlay
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (trustActive) {
      const nodes = generateTrustNetwork()
      const overlay = new TrustNetworkOverlay(nodes, trustMode)
      overlay.addTo(map)
      trustOverlayRef.current = overlay
      // Rauszoomen: globale Sicht
      map.setView([30, 10], 3, { animate: true })
    } else {
      if (trustOverlayRef.current) {
        map.removeLayer(trustOverlayRef.current)
        trustOverlayRef.current = null
      }
      map.setView([52.52, 13.405], 13, { animate: true })
    }
  }, [trustActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Modus-Wechsel (alle / mein Netz)
  useEffect(() => {
    if (trustOverlayRef.current) {
      trustOverlayRef.current.setMode(trustMode)
      if (trustMode === 'my' && mapInstanceRef.current) {
        mapInstanceRef.current.setView([52.52, 13.405], 6, { animate: true })
      } else if (trustMode === 'all' && mapInstanceRef.current) {
        mapInstanceRef.current.setView([30, 10], 3, { animate: true })
      }
    }
  }, [trustMode])

  // ────────────────────────────────────────────────────────
  // Kacheln-Management
  // ────────────────────────────────────────────────────────
  const openModule = useCallback((moduleId: ModuleId) => {
    setTiles(prev => {
      if (prev.find(t => t.moduleId === moduleId)) {
        return prev.filter(t => t.moduleId !== moduleId)
      }
      return [...prev, {
        id: `${moduleId}-${Date.now()}`,
        moduleId,
        size: '1x1',
      }]
    })
  }, [])

  const closeTile = useCallback((id: string) => {
    setTiles(prev => prev.filter(t => t.id !== id))
  }, [])

  const resizeTile = useCallback((id: string) => {
    setTiles(prev => prev.map(t =>
      t.id === id ? { ...t, size: NEXT_SIZE[t.size] } : t
    ))
  }, [])

  const isModuleOpen = (moduleId: ModuleId) => tiles.some(t => t.moduleId === moduleId)

  // ────────────────────────────────────────────────────────
  // Karten-Layer wechseln
  // ────────────────────────────────────────────────────────
  const switchMapLayer = (layerKey: MapLayer) => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const layerConfig = MAP_LAYERS[layerKey]
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    })
    newLayer.addTo(map)
    tileLayerRef.current = newLayer
    if (mapRef.current) mapRef.current.style.filter = layerConfig.cssFilter || ''
    setActiveMapLayer(layerKey)
  }

  const handleHashtagClick = (_tag: string, _category: 'offer' | 'need') => {}

  // ────────────────────────────────────────────────────────
  // Drag-to-scroll Module Nav
  // ────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!moduleScrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - moduleScrollRef.current.offsetLeft)
    setScrollLeft(moduleScrollRef.current.scrollLeft)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !moduleScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - moduleScrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    moduleScrollRef.current.scrollLeft = scrollLeft - walk
  }
  const handleMouseUp = () => setIsDragging(false)

  const scrollModules = (direction: 'left' | 'right') => {
    if (!moduleScrollRef.current) return
    moduleScrollRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  const hasTiles = tiles.length > 0

  return (
    <>
      {/* Leaflet-Karte Hintergrund */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* === TOP LEFT: Space Selector + Search === */}
      <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 50, display: 'flex', gap: 6, height: '40px' }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button
            onClick={() => setSpaceDropdownOpen(!spaceDropdownOpen)}
            className="flex items-center gap-2 px-4 h-full hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Real Life Stack</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              {spaceDropdownOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
            </svg>
          </button>
          {spaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 min-w-[200px]" style={{ zIndex: 100 }}>
              <FloatingCard padding="small" backgroundOpacity={98}>
                <div className="flex flex-col gap-1">
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">🌍 Community Berlin</button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">🏠 Meine WG</button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-500">+ Neuer Space</button>
                </div>
              </FloatingCard>
            </div>
          )}
        </FloatingCard>

        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full flex items-center gap-2 px-4 hover:bg-gray-50 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Suche</span>
          </button>
        </FloatingCard>
      </div>

      {/* === TOP CENTER: Module Navigation === */}
      <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: '560px' }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <div className="flex items-center" style={{ height: '40px' }}>
            <button onClick={() => scrollModules('left')} className="px-2 py-2 hover:bg-gray-50 transition-colors flex items-center justify-center" style={{ height: '100%' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div
              ref={moduleScrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex items-center gap-1 overflow-x-auto px-2"
              style={{ width: '360px', scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
              {NAV_MODULES.map((moduleId) => {
                const meta = MODULE_META[moduleId]
                const open = isModuleOpen(moduleId)
                return (
                  <button
                    key={moduleId}
                    onClick={() => openModule(moduleId)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-1.5 ${
                      open ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span style={{ fontSize: '13px' }}>{meta.icon}</span>
                    {meta.label}
                  </button>
                )
              })}
            </div>
            <button onClick={() => scrollModules('right')} className="px-2 py-2 hover:bg-gray-50 transition-colors flex items-center justify-center" style={{ height: '100%' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </FloatingCard>
      </div>

      {/* === TOP RIGHT: Web of Trust + Dark Mode + Login === */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 50, display: 'flex', gap: 6, height: '40px' }}>

        {/* Web of Trust Button */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button
            onClick={() => setTrustActive(v => !v)}
            className="h-full px-2.5 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
            title="Web of Trust anzeigen"
            style={{ backgroundColor: trustActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={trustActive ? '#8b5cf6' : '#4b5563'} strokeWidth="2">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="4" cy="19" r="2"/>
              <circle cx="20" cy="19" r="2"/>
              <line x1="12" y1="7" x2="4" y2="17"/>
              <line x1="12" y1="7" x2="20" y2="17"/>
              <line x1="4" y1="19" x2="20" y2="19"/>
            </svg>
            {trustActive && (
              <span className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>Netz</span>
            )}
          </button>
        </FloatingCard>

        {/* Dark Mode */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full px-2.5 hover:bg-gray-50 rounded-lg transition-colors flex items-center" title="Dark Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </FloatingCard>

        {/* Login */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full flex items-center gap-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="font-medium text-gray-700 text-xs">Login</span>
          </button>
        </FloatingCard>
      </div>

      {/* === WEB OF TRUST INFO-LEISTE === */}
      {trustActive && (
        <TrustInfoBar
          mode={trustMode}
          onModeChange={setTrustMode}
          onClose={() => setTrustActive(false)}
        />
      )}

      {/* === LEFT CENTER: Zoom Controls === */}
      <div style={{ position: 'fixed', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 50 }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <div className="flex flex-col">
            <button onClick={() => mapInstanceRef.current?.zoomIn()} className="px-2.5 py-2 hover:bg-gray-50 transition-colors border-b border-gray-200" title="Zoom In">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button onClick={() => mapInstanceRef.current?.zoomOut()} className="px-2.5 py-2 hover:bg-gray-50 transition-colors" title="Zoom Out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </FloatingCard>
      </div>

      {/* === RIGHT CENTER: Layer Switcher === */}
      <div style={{ position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 50 }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <div className="flex flex-col">
            {(Object.keys(MAP_LAYERS) as MapLayer[]).map((layerKey, idx, arr) => {
              const layer = MAP_LAYERS[layerKey]
              const isActive = activeMapLayer === layerKey
              return (
                <button
                  key={layerKey}
                  onClick={() => switchMapLayer(layerKey)}
                  title={layer.label}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-2.5 transition-all ${idx < arr.length - 1 ? 'border-b border-gray-200' : ''}`}
                  style={{ backgroundColor: isActive ? '#667eea' : 'transparent' }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{layer.icon}</span>
                  <span className="font-medium" style={{ fontSize: '9px', color: isActive ? 'white' : '#9ca3af' }}>{layer.label}</span>
                </button>
              )
            })}
          </div>
        </FloatingCard>
      </div>

      {/* === BOTTOM LEFT: Filter === */}
      <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 50, height: '40px' }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full flex items-center gap-2 px-4 hover:bg-gray-50 rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Filter</span>
          </button>
        </FloatingCard>
      </div>

      {/* === BOTTOM RIGHT: Quick Actions === */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, height: '40px' }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="h-full flex items-center gap-2 px-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-600">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Neu</span>
          </button>
          {quickActionsOpen && (
            <div className="absolute bottom-full right-0 mb-2 min-w-[200px]" style={{ zIndex: 100 }}>
              <FloatingCard padding="small" backgroundOpacity={98}>
                <div className="flex flex-col gap-1">
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">📅 Neuer Kalendereintrag</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">🛒 Neues Angebot</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">⚔️ Neue Quest</button>
                </div>
              </FloatingCard>
            </div>
          )}
        </FloatingCard>
      </div>

      {/* === BOTTOM CENTER: Player HUD === */}
      <PlayerHUD onOpenModule={openModule} />

      {/* === KACHEL-GRID === */}
      {hasTiles && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 60,
            right: 60,
            bottom: 88,
            zIndex: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {tiles.map((tile) => {
            const span = TILE_SPAN[tile.size]
            return (
              <div
                key={tile.id}
                style={{
                  gridColumn: `span ${span.col}`,
                  gridRow: `span ${span.row}`,
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <FloatingCard padding="none" backgroundOpacity={98} shadow="large" rounded="large" className="flex flex-col h-full overflow-hidden">
                  <TileHeader
                    moduleId={tile.moduleId}
                    size={tile.size}
                    onResize={() => resizeTile(tile.id)}
                    onClose={() => closeTile(tile.id)}
                  />
                  <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                    <TileContent moduleId={tile.moduleId} onHashtagClick={handleHashtagClick} />
                  </div>
                </FloatingCard>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
