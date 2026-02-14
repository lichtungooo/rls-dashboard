/**
 * Dashboard mit Leaflet im Hintergrund + Widgets darüber
 * Widgets sind verschiebbar & größenänderbar mit react-grid-layout
 */

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ProfilWidget } from './widgets/ProfilWidget'
import { KalenderWidget } from './widgets/KalenderWidget'
import { FeedWidget } from './widgets/FeedWidget'

// Icon-Fix
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_LAYOUT = [
  { i: 'profil', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
  { i: 'kalender', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
  { i: 'feed', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
]

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // Grid Layout State - mit localStorage
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboard-layout')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved layout:', e)
      }
    }
    return DEFAULT_LAYOUT
  })

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Natives Leaflet
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
      .bindPopup('<strong>🌱 Gemeinschaftsgarten</strong><br/>Urban Gardening Treffpunkt')

    L.marker([52.53, 13.42])
      .addTo(map)
      .bindPopup('<strong>🔧 Repair Café</strong><br/>Jeden Samstag 14-18 Uhr')

    mapInstanceRef.current = map

    return () => {
      map.remove()
    }
  }, [])

  const onLayoutChange = (newLayout: any) => {
    setLayout(newLayout)
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
    console.log('Layout saved:', newLayout)
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    localStorage.removeItem('dashboard-layout')
    console.log('Layout reset to default')
  }

  return (
    <>
      {/* Karte im Hintergrund (fixed) */}
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

      {/* Dashboard-Layer darüber */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        padding: '16px',
        pointerEvents: 'none' // Karte bleibt klickbar
      }}>
        {/* Top-Navigation */}
        <div className="widget mb-4 p-3 flex items-center justify-between" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🗺️</span>
            <h1 className="font-bold text-gray-800">Real Life Stack - Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetLayout}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
            >
              🔄 Reset Layout
            </button>
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
              + Widget
            </button>
            <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
              👤 Profil
            </button>
          </div>
        </div>

        {/* Info-Banner */}
        <div className="widget mb-4 p-3 bg-green-50 border border-green-200" style={{ pointerEvents: 'auto' }}>
          <p className="text-sm text-green-800">
            <strong>✨ Drag & Drop aktiviert!</strong> Ziehe die Widgets an der Titelleiste, um sie zu verschieben.
            Ziehe an der rechten unteren Ecke, um die Größe zu ändern!
          </p>
        </div>

        {/* Widgets Grid mit react-grid-layout */}
        <div style={{ pointerEvents: 'auto' }}>
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={50}
            width={1400}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
            isDraggable={true}
            isResizable={true}
            compactType={null}
            preventCollision={false}
          >
            <div key="profil" className="widget-container">
              <div className="drag-handle">
                <span className="text-xs text-gray-500 cursor-move">⋮⋮ Verschieben</span>
              </div>
              <ProfilWidget />
            </div>

            <div key="kalender" className="widget-container">
              <div className="drag-handle">
                <span className="text-xs text-gray-500 cursor-move">⋮⋮ Verschieben</span>
              </div>
              <KalenderWidget />
            </div>

            <div key="feed" className="widget-container">
              <div className="drag-handle">
                <span className="text-xs text-gray-500 cursor-move">⋮⋮ Verschieben</span>
              </div>
              <FeedWidget />
            </div>
          </GridLayout>
        </div>
      </div>
    </>
  )
}
