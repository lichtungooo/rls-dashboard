/**
 * Dashboard mit Leaflet-Karte im Hintergrund
 * Widgets verschiebbar & größenänderbar mit react-grid-layout
 */

import { MapBackground } from './components/MapBackground'
import { ProfilWidget } from './widgets/ProfilWidget'
import { KalenderWidget } from './widgets/KalenderWidget'
import { FeedWidget } from './widgets/FeedWidget'

function App() {
  return (
    <>
      {/* Leaflet-Karte im Hintergrund - fixiert */}
      <MapBackground />

      {/* Dashboard-Layer darüber */}
      <div id="dashboard-layer" className="min-h-screen p-4">
        {/* Top-Navigation (schwebend) */}
        <div className="widget mb-4 p-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl">🗺️</span>
            <h1 className="font-bold text-gray-800">Real Life Stack - Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
              + Widget
            </button>
            <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
              👤 Profil
            </button>
          </div>
        </div>

        {/* Info-Banner */}
        <div className="widget mb-4 p-3 bg-blue-50 border border-blue-200 pointer-events-auto">
          <p className="text-sm text-blue-800">
            <strong>🗺️ Leaflet-Karte im Hintergrund!</strong> Scroll und zoome die interaktive Karte.
            Widgets floaten darüber. Grid-Layout mit Drag & Drop kommt als nächstes!
          </p>
        </div>

        {/* Widgets in Grid (erstmal statisch) */}
        <div className="grid grid-cols-3 gap-4 pointer-events-auto max-w-7xl">
          <div className="h-[450px]">
            <ProfilWidget />
          </div>

          <div className="h-[450px]">
            <KalenderWidget />
          </div>

          <div className="h-[450px]">
            <FeedWidget />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
