/**
 * Modulares Dashboard im Real-Life-Stack Stil
 * - TopNavigation mit Modul-Auswahl
 * - Layout-Presets (1/2/3-spaltig)
 * - Split-View mit Resizer
 * - Leaflet-Karte im Hintergrund
 */

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TopNavigation, type NavModule } from './components/TopNavigation'
import { FloatingCard } from './components/FloatingCard'
import { ProfilWidget } from './widgets/ProfilWidget'
import { KalenderWidget } from './widgets/KalenderWidget'
import { FeedWidget } from './widgets/FeedWidget'

// Icon-Fix für Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type LayoutPreset = 'map-only' | 'single' | 'split-h' | 'split-v' | 'three-col'
type ModuleType = 'map' | 'profil' | 'kalender' | 'feed' | 'marktplatz'

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // State
  const [activeModules, setActiveModules] = useState<ModuleType[]>(['map'])
  const [layout, setLayout] = useState<LayoutPreset>('map-only')
  const [splitPosition, setSplitPosition] = useState(50) // % für Split-View

  // Leaflet Map initialisieren
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([52.52, 13.405], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    // Demo-Marker
    L.marker([52.52, 13.405])
      .addTo(map)
      .bindPopup('<strong>🗺️ Real Life Stack</strong><br/>Community-Zentrale')

    L.marker([52.51, 13.38])
      .addTo(map)
      .bindPopup('<strong>🌱 Gemeinschaftsgarten</strong><br/>Urban Gardening')

    L.marker([52.53, 13.42])
      .addTo(map)
      .bindPopup('<strong>🔧 Repair Café</strong><br/>Jeden Samstag 14-18 Uhr')

    mapInstanceRef.current = map

    return () => {
      map.remove()
    }
  }, [])

  // Module Toggle
  const toggleModule = (moduleId: ModuleType) => {
    if (moduleId === 'map') {
      setActiveModules(['map'])
      setLayout('map-only')
      return
    }

    // Wenn Modul bereits aktiv, entfernen (außer es ist das einzige)
    if (activeModules.includes(moduleId) && activeModules.length > 1) {
      const newModules = activeModules.filter(m => m !== moduleId)
      setActiveModules(newModules)
      adjustLayout(newModules)
      return
    }

    // Modul hinzufügen
    const newModules = [...activeModules.filter(m => m !== 'map'), moduleId]
    setActiveModules(newModules)
    adjustLayout(newModules)
  }

  // Layout automatisch anpassen basierend auf Anzahl der Module
  const adjustLayout = (modules: ModuleType[]) => {
    if (modules.length === 0) {
      setLayout('map-only')
    } else if (modules.length === 1) {
      setLayout('single')
    } else if (modules.length === 2) {
      setLayout('split-h')
    } else {
      setLayout('three-col')
    }
  }

  // Navigation Module
  const navModules: NavModule[] = [
    {
      id: 'map',
      label: 'Karte',
      icon: '🗺️',
      active: layout === 'map-only',
      onClick: () => toggleModule('map')
    },
    {
      id: 'profil',
      label: 'Profil',
      icon: '👤',
      active: activeModules.includes('profil'),
      onClick: () => toggleModule('profil')
    },
    {
      id: 'kalender',
      label: 'Kalender',
      icon: '📅',
      active: activeModules.includes('kalender'),
      onClick: () => toggleModule('kalender')
    },
    {
      id: 'feed',
      label: 'Feed',
      icon: '📰',
      active: activeModules.includes('feed'),
      onClick: () => toggleModule('feed')
    },
    {
      id: 'marktplatz',
      label: 'Marktplatz',
      icon: '🛒',
      active: activeModules.includes('marktplatz'),
      onClick: () => alert('Marktplatz kommt bald!')
    },
  ]

  // Modul-Content rendern
  const renderModule = (moduleId: ModuleType) => {
    switch (moduleId) {
      case 'profil':
        return <ProfilWidget />
      case 'kalender':
        return <KalenderWidget />
      case 'feed':
        return <FeedWidget />
      case 'marktplatz':
        return <div className="p-4">Marktplatz (Coming Soon)</div>
      default:
        return null
    }
  }

  return (
    <>
      {/* Leaflet-Karte im Hintergrund */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0
      }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Top Navigation */}
      <TopNavigation
        modules={navModules}
        profile={
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Login
            </button>
          </div>
        }
      />

      {/* Layout Controls */}
      {activeModules.length > 0 && activeModules[0] !== 'map' && (
        <div className="fixed top-20 right-4 z-40">
          <FloatingCard padding="small" backgroundOpacity={95}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Layout:</span>
              <button
                onClick={() => setLayout('single')}
                className={`p-2 rounded ${layout === 'single' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Einzeln"
              >
                ▢
              </button>
              <button
                onClick={() => setLayout('split-h')}
                className={`p-2 rounded ${layout === 'split-h' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Split Horizontal"
              >
                ⬌
              </button>
              <button
                onClick={() => setLayout('three-col')}
                className={`p-2 rounded ${layout === 'three-col' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="3 Spalten"
              >
                |||
              </button>
            </div>
          </FloatingCard>
        </div>
      )}

      {/* Content Layer */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: '5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        paddingBottom: '1rem',
        minHeight: '100vh',
        pointerEvents: 'none'
      }}>
        {/* Map-Only: Keine Widgets */}
        {layout === 'map-only' && null}

        {/* Single: Ein Modul mittig */}
        {layout === 'single' && activeModules.length > 0 && (
          <div style={{ pointerEvents: 'auto', maxWidth: '1200px', margin: '0 auto' }}>
            <FloatingCard padding="none" backgroundOpacity={98}>
              <div style={{ height: '80vh', overflow: 'hidden' }}>
                {renderModule(activeModules[0])}
              </div>
            </FloatingCard>
          </div>
        )}

        {/* Split Horizontal: 2 Module nebeneinander */}
        {layout === 'split-h' && (
          <div style={{
            pointerEvents: 'auto',
            display: 'flex',
            gap: '1rem',
            height: 'calc(100vh - 7rem)'
          }}>
            <FloatingCard
              padding="none"
              backgroundOpacity={98}
              style={{ flex: `0 0 ${splitPosition}%`, minWidth: '300px' }}
            >
              <div style={{ height: '100%', overflow: 'auto' }}>
                {renderModule(activeModules[0])}
              </div>
            </FloatingCard>

            {activeModules[1] && (
              <FloatingCard
                padding="none"
                backgroundOpacity={98}
                style={{ flex: 1, minWidth: '300px' }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  {renderModule(activeModules[1])}
                </div>
              </FloatingCard>
            )}
          </div>
        )}

        {/* Three Columns: 3 Module */}
        {layout === 'three-col' && (
          <div style={{
            pointerEvents: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            height: 'calc(100vh - 7rem)'
          }}>
            {activeModules.slice(0, 3).map((moduleId, idx) => (
              <FloatingCard
                key={idx}
                padding="none"
                backgroundOpacity={98}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  {renderModule(moduleId)}
                </div>
              </FloatingCard>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
