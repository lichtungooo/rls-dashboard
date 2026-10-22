/**
 * Clean Dashboard - Map + dynamisches Kachel-System
 * Grid: 12 Spalten, unbegrenzt nach unten (scrollbar)
 * Kacheln: Drag & Drop, frei skalierbar, Vollbild, Lock/Unlock
 * Jede Kachel: Vollbild-Button + Schließen in Title Bar
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import RGL from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
// Cast to any to avoid type issues with export= pattern
const GridLayout = RGL as any
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { FloatingCard } from './components/FloatingCard'
import { PlayerHUD } from './components/PlayerHUD'
import { ProfilWidget } from './widgets/ProfilWidget'
import { KalenderWidget } from './widgets/KalenderWidget'
import { FeedWidget } from './widgets/FeedWidget'
import { WalletTile, SkillsTile, AvatarTile, LogTile } from './components/HUDTiles'
import { createTrustOverlay } from './components/TrustNetworkLayer'
import { GlobeView } from './components/GlobeView'
import { EliMascot } from './components/EliMascot'

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

type ModuleId =
  | 'profil' | 'kalender' | 'marktplatz' | 'wertschoepfung' | 'quest'
  | 'avatar' | 'skilltree' | 'log' | 'feed'
  | 'entscheidung' | 'wissensdatenbank' | 'eli' | 'health' | 'notifications'
  | 'wallet'
type MapLayer = 'normal' | 'satellit' | 'fantasy' | 'globe'
type TrustMode = 'all' | 'my'

// Grid-Layout Typen
interface GridItem { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number }
interface GridLayouts { lg: GridItem[] }

interface Tile {
  id: string
  moduleId: ModuleId
}

// Grid: 12 Spalten, unbegrenzte Zeilen (scrollbar)
const GRID_COLS = 12

// Module-Metadaten (alle 14 Module aus module-und-komponenten.md)
const MODULE_META: Record<ModuleId, { label: string; icon: string }> = {
  // Kern-Module
  profil:          { label: 'Profil',          icon: '👤' },
  kalender:        { label: 'Kalender',        icon: '📅' },
  marktplatz:      { label: 'Marktplatz',      icon: '🛒' },
  wertschoepfung:  { label: 'Wertschöpfung',   icon: '💎' },
  // Gamification
  quest:           { label: 'Quest',           icon: '⚔️' },
  avatar:          { label: 'Avatar',          icon: '🎭' },
  skilltree:       { label: 'Skill-Tree',      icon: '🌳' },
  log:             { label: 'Log',             icon: '📄' },
  // Social
  feed:            { label: 'Feed',            icon: '📰' },
  // Erweitert
  entscheidung:    { label: 'Entscheidung',    icon: '🗳️' },
  wissensdatenbank:{ label: 'Wissen',          icon: '📚' },
  eli:             { label: 'Eli',             icon: '🦉' },
  health:          { label: 'Health',          icon: '🌿' },
  notifications:   { label: 'Benachrichtigung',icon: '🔔' },
  // HUD-Module
  wallet:          { label: 'Wallet',          icon: '💳' },
}

// Top-Navigation Module (Haupt-Module in der oberen Leiste)
const NAV_MODULES: ModuleId[] = [
  'profil', 'kalender', 'marktplatz', 'quest', 'wertschoepfung',
  'feed', 'skilltree', 'avatar', 'log',
  'entscheidung', 'wissensdatenbank', 'eli', 'health', 'notifications',
]

// Kartenlagen (Tile-basierte Karten)
const TILE_LAYERS: Record<string, { url: string; attribution: string; maxZoom: number; label: string; icon: string; cssFilter?: string }> = {
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

// Alle Ansichts-Modi (inkl. 3D-Globus)
const ALL_LAYERS: { key: MapLayer; label: string; icon: string }[] = [
  { key: 'normal',   label: 'Normal',   icon: '🗺️' },
  { key: 'satellit', label: 'Satellit', icon: '🛰️' },
  { key: 'fantasy',  label: 'Fantasy',  icon: '🧙' },
  { key: 'globe',    label: '3D',       icon: '🌍' },
]

// ============================================================
// KACHEL-INHALT
// ============================================================

function TileContent({ moduleId, onHashtagClick }: { moduleId: ModuleId; onHashtagClick: (tag: string, cat: 'offer' | 'need') => void }) {
  switch (moduleId) {
    case 'profil':   return <ProfilWidget onHashtagClick={onHashtagClick} />
    case 'kalender': return <KalenderWidget />
    case 'feed':     return <FeedWidget />
    case 'wallet':   return <WalletTile />
    case 'skilltree': return <SkillsTile />
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
// KACHEL-KOPFZEILE (minimaler Drag-Handle + Schließen)
// ============================================================

function TileHeader({
  moduleId,
  onClose,
  onFullscreen,
  isFullscreen,
}: {
  moduleId: ModuleId
  onClose: () => void
  onFullscreen: () => void
  isFullscreen: boolean
}) {
  const meta = MODULE_META[moduleId]

  return (
    <div
      className="tile-drag-handle flex items-center justify-between px-2.5 py-1 border-b border-gray-100/50 flex-shrink-0"
      style={{ backgroundColor: 'rgba(249,250,251,0.6)', cursor: isFullscreen ? 'default' : 'move', minHeight: 28 }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: '11px' }}>{meta.icon}</span>
        <span className="text-[10px] font-semibold text-gray-500">{meta.label}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onFullscreen}
          onMouseDown={e => e.stopPropagation()}
          title={isFullscreen ? 'Vollbild beenden (ESC)' : 'Vollbild'}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-blue-50 transition-colors text-gray-300 hover:text-blue-500"
        >
          {isFullscreen ? (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
        <button
          onClick={onClose}
          onMouseDown={e => e.stopPropagation()}
          title="Schließen"
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
  const trustOverlayRef = useRef<{ remove: () => void } | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [gridLayouts, setGridLayouts] = useState<GridLayouts>({ lg: [] })
  const [layoutLocked, setLayoutLocked] = useState(false)
  // Dashboard ein/ausblenden (Layout bleibt gespeichert)
  const [dashboardVisible, setDashboardVisible] = useState(true)
  const savedDashboardRef = useRef<{ tiles: Tile[], layouts: GridLayouts } | null>(null)
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayer>('normal')
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Web of Trust State
  const [trustActive, setTrustActive] = useState(false)
  const [trustMode, setTrustMode] = useState<TrustMode>('all')

  // Tour-Highlight (welches UI-Element gerade hervorgehoben wird)
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null)

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
      const layer = TILE_LAYERS.normal
      const tileLayer = L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: layer.maxZoom })
      tileLayer.addTo(map)
      tileLayerRef.current = tileLayer
      mapInstanceRef.current = map
      // Trust-Pins IMMER auf der Karte anzeigen (echte anklickbare Marker)
      trustOverlayRef.current = createTrustOverlay(map)
      setTimeout(() => { map.invalidateSize() }, 200)
    } catch (error) {
      console.error('❌ Error initializing map:', error)
    }
    return () => {
      if (trustOverlayRef.current) {
        trustOverlayRef.current.remove()
        trustOverlayRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Web of Trust: Pins sind IMMER auf der Leaflet-Karte (echte MarkerCluster).
  // Der 3D-Globus ist eine optionale Zusatzansicht.

  // ────────────────────────────────────────────────────────
  // Kacheln-Management
  // ────────────────────────────────────────────────────────
  // Startgröße für neue Kacheln
  const TILE_START_W = 2
  const TILE_START_H = 2

  // Nächste freie Grid-Position finden (links→rechts, dann nächste Reihe)
  const findNextFreeSlot = useCallback((currentLayouts: GridItem[], w: number, h: number): { x: number; y: number } => {
    const occupied = new Set<string>()
    for (const l of currentLayouts) {
      for (let dx = 0; dx < l.w; dx++) {
        for (let dy = 0; dy < l.h; dy++) {
          occupied.add(`${l.x + dx},${l.y + dy}`)
        }
      }
    }
    // Links→rechts, dann nächste Reihe (unbegrenzt nach unten)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= GRID_COLS - w; x++) {
        let fits = true
        for (let dx = 0; dx < w && fits; dx++) {
          for (let dy = 0; dy < h && fits; dy++) {
            if (occupied.has(`${x + dx},${y + dy}`)) fits = false
          }
        }
        if (fits) return { x, y }
      }
    }
    const maxY = currentLayouts.reduce((max, l) => Math.max(max, l.y + l.h), 0)
    return { x: 0, y: maxY }
  }, [])

  // Vollbild: GESAMTES Layout speichern + nur das eine Tile anzeigen
  const [fullscreenTileId, setFullscreenTileId] = useState<string | null>(null)
  const preFullscreenLayoutRef = useRef<GridItem[]>([])

  const openModule = useCallback((moduleId: ModuleId) => {
    // Wenn im Vollbild: erstmal ignorieren
    if (fullscreenTileId) return
    setTiles(prev => {
      if (prev.find(t => t.moduleId === moduleId)) {
        // Toggle: Modul schließen
        setGridLayouts(gl => ({
          lg: gl.lg.filter(l => !l.i.startsWith(moduleId + '-'))
        }))
        return prev.filter(t => t.moduleId !== moduleId)
      }
      const id = `${moduleId}-${Date.now()}`
      setGridLayouts(gl => {
        const pos = findNextFreeSlot(gl.lg, TILE_START_W, TILE_START_H)
        return { lg: [...gl.lg, { i: id, x: pos.x, y: pos.y, w: TILE_START_W, h: TILE_START_H, minW: 1, minH: 1, maxW: GRID_COLS, maxH: 6 }] }
      })
      return [...prev, { id, moduleId }]
    })
  }, [findNextFreeSlot, fullscreenTileId])

  const closeTile = useCallback((id: string) => {
    if (fullscreenTileId === id) {
      // Aus Vollbild raus und schließen
      setFullscreenTileId(null)
      setGridLayouts({ lg: preFullscreenLayoutRef.current.filter(l => l.i !== id) })
      preFullscreenLayoutRef.current = []
    } else {
      setGridLayouts(gl => ({ lg: gl.lg.filter(l => l.i !== id) }))
    }
    setTiles(prev => prev.filter(t => t.id !== id))
  }, [fullscreenTileId])

  // Vollbild: Gesamtes Layout speichern, nur das eine Tile auf 12x6 setzen
  const toggleFullscreen = useCallback((id: string) => {
    if (fullscreenTileId === id) {
      // Zurück: Gesamtes Layout wiederherstellen
      setGridLayouts({ lg: preFullscreenLayoutRef.current })
      preFullscreenLayoutRef.current = []
      setFullscreenTileId(null)
    } else {
      // Vorher: Gesamtes Layout sichern
      setGridLayouts(gl => {
        preFullscreenLayoutRef.current = gl.lg.map(l => ({ ...l }))
        // Nur das eine Tile, maximal groß
        return { lg: [{ i: id, x: 0, y: 0, w: GRID_COLS, h: 6, minW: 1, minH: 1, maxW: GRID_COLS, maxH: 6 }] }
      })
      setFullscreenTileId(id)
    }
  }, [fullscreenTileId])

  // ESC zum Beenden von Vollbild
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenTileId) {
        toggleFullscreen(fullscreenTileId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenTileId, toggleFullscreen])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback((layout: any) => {
    setGridLayouts({ lg: layout })
  }, [])

  const isModuleOpen = (moduleId: ModuleId) => tiles.some(t => t.moduleId === moduleId)

  const hasTiles = tiles.length > 0 || fullscreenTileId !== null

  // Dashboard schließen (Layout merken) und wiederherstellen
  const closeDashboard = useCallback(() => {
    savedDashboardRef.current = { tiles: [...tiles], layouts: { lg: [...gridLayouts.lg] } }
    setTiles([])
    setGridLayouts({ lg: [] })
    setDashboardVisible(false)
  }, [tiles, gridLayouts])

  const reopenDashboard = useCallback(() => {
    if (savedDashboardRef.current) {
      setTiles(savedDashboardRef.current.tiles)
      setGridLayouts(savedDashboardRef.current.layouts)
      savedDashboardRef.current = null
    }
    setDashboardVisible(true)
  }, [])

  // ────────────────────────────────────────────────────────
  // Karten-Layer wechseln
  // ────────────────────────────────────────────────────────
  const switchMapLayer = (layerKey: MapLayer) => {
    if (layerKey === 'globe') {
      // 3D-Globus: Leaflet-Karte bleibt im Hintergrund, Globus wird darüber gelegt
      setActiveMapLayer('globe')
      return
    }
    // Tile-basierte Karten
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const layerConfig = TILE_LAYERS[layerKey]
    if (!layerConfig) return
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

  // Tour-Highlight-Style (pulsierender Glow)
  const highlightStyle: React.CSSProperties = {
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    animation: 'tour-pulse 1.5s ease-in-out infinite',
  }

  return (
    <>
      {/* Leaflet-Karte Hintergrund (versteckt wenn 3D-Globus aktiv) */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0,
        display: activeMapLayer === 'globe' ? 'none' : 'block',
      }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* 3D-Globus (gleiche Pins, andere Darstellung) */}
      <GlobeView visible={activeMapLayer === 'globe'} mode={trustActive && trustMode === 'my' ? 'my' : 'all'} />

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
      <div data-tour="nav-modules" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: '560px', ...(highlightTarget === 'nav-modules' ? highlightStyle : {}) }}>
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

      {/* === TOP RIGHT: Lock, Dashboard, Netz, Dark Mode, Login === */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 50, display: 'flex', gap: 6, height: '40px' }}>

        {/* 1. Layout Lock/Unlock */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button
            onClick={() => setLayoutLocked(l => !l)}
            className="h-full flex items-center gap-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
            title={layoutLocked ? 'Layout entsperren' : 'Layout fixieren'}
            style={{ backgroundColor: layoutLocked ? 'rgba(245, 158, 11, 0.12)' : 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={layoutLocked ? '#f59e0b' : '#4b5563'} strokeWidth="2">
              {layoutLocked ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </>
              )}
            </svg>
            <span className="font-medium text-sm" style={{ color: layoutLocked ? '#f59e0b' : '#6b7280' }}>
              {layoutLocked ? 'Fixiert' : 'Frei'}
            </span>
          </button>
        </FloatingCard>

        {/* 2. Dashboard ein/aus */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          {hasTiles && dashboardVisible ? (
            <button
              onClick={closeDashboard}
              className="h-full flex items-center gap-2 px-3 hover:bg-red-50 rounded-lg transition-colors"
              title="Dashboard schließen (Layout bleibt gespeichert)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span className="font-medium text-sm text-gray-600">Dashboard</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={savedDashboardRef.current ? reopenDashboard : undefined}
              className="h-full flex items-center gap-2 px-3 hover:bg-blue-50 rounded-lg transition-colors"
              title={savedDashboardRef.current ? 'Dashboard wiederherstellen' : 'Kein gespeichertes Dashboard'}
              style={{ opacity: savedDashboardRef.current ? 1 : 0.4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={savedDashboardRef.current ? '#3b82f6' : '#9ca3af'} strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span className="font-medium text-sm" style={{ color: savedDashboardRef.current ? '#3b82f6' : '#9ca3af' }}>Dashboard</span>
            </button>
          )}
        </FloatingCard>

        {/* 3. Web of Trust / Netz */}
        <div data-tour="trust-button" style={highlightTarget === 'trust-button' ? { ...highlightStyle, borderRadius: 10 } : {}}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button
            onClick={() => setTrustActive(v => !v)}
            className="h-full flex items-center gap-2 px-3 hover:bg-gray-50 rounded-lg transition-all"
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
            <span className="font-medium text-sm" style={{ color: trustActive ? '#8b5cf6' : '#6b7280' }}>Netz</span>
          </button>
        </FloatingCard>
        </div>

        {/* 4. Dark Mode */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full flex items-center gap-2 px-3 hover:bg-gray-50 rounded-lg transition-colors" title="Dark Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </FloatingCard>

        {/* 5. Login */}
        <FloatingCard padding="none" backgroundOpacity={95}>
          <button className="h-full flex items-center gap-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Login</span>
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

      {/* === RIGHT CENTER: Layer Switcher (immer sichtbar) === */}
      <div data-tour="layer-switcher" style={{ position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 50, ...(highlightTarget === 'layer-switcher' ? highlightStyle : {}) }}>
        <FloatingCard padding="none" backgroundOpacity={95}>
          <div className="flex flex-col">
            {ALL_LAYERS.map((layer, idx) => {
              const isActive = activeMapLayer === layer.key
              return (
                <button
                  key={layer.key}
                  onClick={() => switchMapLayer(layer.key)}
                  title={layer.label}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-2.5 transition-all ${idx < ALL_LAYERS.length - 1 ? 'border-b border-gray-200' : ''}`}
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
      <div data-tour="quick-actions" style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, height: '40px', ...(highlightTarget === 'quick-actions' ? highlightStyle : {}) }}>
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
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">📍 Profil auf Karte setzen</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">📅 Neuer Kalendereintrag</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">🛒 Neues Angebot</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">⚔️ Neue Quest</button>
                  <button className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm">🎉 Neues Event</button>
                </div>
              </FloatingCard>
            </div>
          )}
        </FloatingCard>
      </div>

      {/* === BOTTOM CENTER: Player HUD === */}
      <div data-tour="player-hud" style={highlightTarget === 'player-hud' ? { ...highlightStyle, position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 45, borderRadius: 16 } : {}}>
        <PlayerHUD onOpenModule={openModule} />
      </div>

      {/* === KACHELN (Grid 12 Spalten, passt exakt in Viewport) === */}
      {hasTiles && dashboardVisible && (
        <div style={{
          position: 'fixed',
          top: 60,
          left: 56,
          right: 56,
          bottom: 88,
          zIndex: 20,
          overflow: 'hidden',
        }}>
          <div style={{ width: '100%', height: '100%' }}>
            <GridLayout
              className="tile-grid"
              layout={gridLayouts.lg}
              cols={GRID_COLS}
              rowHeight={Math.floor((window.innerHeight - 60 - 88 - 16) / 6)}
              width={window.innerWidth - 112}
              margin={[8, 8] as [number, number]}
              containerPadding={[0, 0] as [number, number]}
              autoSize={false}
              compactType="vertical"
              isResizable={!layoutLocked}
              isDraggable={!layoutLocked}
              draggableHandle=".tile-drag-handle"
              onLayoutChange={handleLayoutChange}
              resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
            >
              {tiles.filter(tile => gridLayouts.lg.some(l => l.i === tile.id)).map((tile) => {
                const isFull = fullscreenTileId === tile.id
                return (
                  <div key={tile.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.97)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    overflow: 'hidden',
                  }}>
                    <TileHeader
                      moduleId={tile.moduleId}
                      onClose={() => closeTile(tile.id)}
                      onFullscreen={() => toggleFullscreen(tile.id)}
                      isFullscreen={isFull}
                    />
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                      <TileContent moduleId={tile.moduleId} onHashtagClick={handleHashtagClick} />
                    </div>
                  </div>
                )
              })}
            </GridLayout>
          </div>
        </div>
      )}

      {/* === MASKOTTCHEN (Eli) === */}
      <EliMascot onHighlight={setHighlightTarget} />

      {/* Tour-Highlight Animation */}
      {highlightTarget && (
        <style>{`
          @keyframes tour-pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3); }
            50% { box-shadow: 0 0 0 5px rgba(139, 92, 246, 0.7), 0 0 30px rgba(139, 92, 246, 0.5); }
          }
        `}</style>
      )}
    </>
  )
}
