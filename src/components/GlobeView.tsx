/**
 * GlobeView — 3D-Globus mit ECHTEN anklickbaren Pins
 *
 * Zeigt DIESELBEN Pins wie die Leaflet-Karte:
 * - Jeder Pin ist anklickbar → zeigt Profil-Popup
 * - Clustering über Arcs (Verbindungsbögen zwischen Regionen)
 * - Gleiche Datenquelle: generateTrustNetwork()
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import {
  generateTrustNetwork,
  clusterPins,
  generateRealArcs,
  type TrustPin,
  type ArcLink,
} from './TrustNetworkLayer'

// ── Texturen ─────────────────────────────────────────────────
const EARTH_NIGHT = '//unpkg.com/three-globe/example/img/earth-night.jpg'
const EARTH_TOPOLOGY = '//unpkg.com/three-globe/example/img/earth-topology.png'
const NIGHT_SKY = '//unpkg.com/three-globe/example/img/night-sky.png'

// ── Props ────────────────────────────────────────────────────

interface GlobeViewProps {
  mode: 'all' | 'my'
  visible: boolean
}

// ── Pin-Popup ────────────────────────────────────────────────

function PinPopup({ pin, connections, allPins, onClose }: {
  pin: TrustPin
  connections: { from: number; to: number }[]
  allPins: Map<number, TrustPin>
  onClose: () => void
}) {
  const parent = pin.parentId !== null ? allPins.get(pin.parentId) : null
  const children = connections.filter(c => c.from === pin.id).length

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.5)',
        minWidth: 220,
        fontFamily: 'system-ui, sans-serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {pin.isRoot ? '⭐ Root Node' : `👤 User #${pin.id}`}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
            color: '#9ca3af', padding: '2px 6px', borderRadius: 4,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
        📍 {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}<br/>
        🔗 Tiefe: {pin.depth} {pin.depth === 0 ? '(Ursprung)' : ''}<br/>
        {parent && <>⬆️ Onboarded von: User #{parent.id}<br/></>}
        ⬇️ Hat {children} onboarded
      </div>
    </div>
  )
}

export function GlobeView({ mode, visible }: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [selectedPin, setSelectedPin] = useState<TrustPin | null>(null)

  // ── Daten vorbereiten (IDENTISCH mit Leaflet-Karte) ─────────
  const { pins, connections } = useMemo(() => generateTrustNetwork(), [])

  const pinMap = useMemo(() => {
    const m = new Map<number, TrustPin>()
    for (const p of pins) m.set(p.id, p)
    return m
  }, [pins])

  const filteredPins = useMemo(() => {
    if (mode === 'my') return pins.filter(p => p.depth <= 3 || p.isRoot)
    return pins
  }, [pins, mode])

  const filteredConnections = useMemo(() => {
    const pinIds = new Set(filteredPins.map(p => p.id))
    return connections.filter(c => pinIds.has(c.from) && pinIds.has(c.to))
  }, [filteredPins, connections])

  // Arcs zwischen Clustern (für die schönen Bogenverbindungen)
  const clusters = useMemo(() => clusterPins(filteredPins, 5), [filteredPins])
  const arcs = useMemo(
    () => generateRealArcs(filteredPins, filteredConnections, clusters),
    [filteredPins, filteredConnections, clusters]
  )

  // ── Globe initialisieren ───────────────────────────────────
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return

    globe.pointOfView(
      mode === 'my'
        ? { lat: 52.5, lng: 13.4, altitude: 1.5 }
        : { lat: 30, lng: 10, altitude: 2.2 },
      1000
    )

    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3
    controls.enableDamping = true
    controls.dampingFactor = 0.1
  }, [mode])

  // ── Modus-Wechsel: Kamera anpassen ────────────────────────
  useEffect(() => {
    if (!globeRef.current || !visible) return
    globeRef.current.pointOfView(
      mode === 'my'
        ? { lat: 52.5, lng: 13.4, altitude: 1.5 }
        : { lat: 30, lng: 10, altitude: 2.2 },
      1500
    )
  }, [mode, visible])

  // ── Pin-Klick Handler ──────────────────────────────────────
  const handlePointClick = useCallback((point: object) => {
    const pin = point as TrustPin
    setSelectedPin(pin)
    // Auto-Rotate stoppen bei Klick
    const globe = globeRef.current
    if (globe) {
      const controls = globe.controls()
      controls.autoRotate = false
    }
  }, [])

  // ── HTML-Element für jeden Pin ─────────────────────────────
  const pointLabel = useCallback((d: object) => {
    const pin = d as TrustPin
    if (pin.isRoot) return '⭐ Root'
    return `User #${pin.id}`
  }, [])

  const pointColor = useCallback((d: object) => {
    const pin = d as TrustPin
    if (pin.isRoot) return 'rgba(251, 191, 36, 1.0)'
    if (pin.depth <= 3) return 'rgba(139, 92, 246, 1.0)'
    return 'rgba(180, 160, 255, 0.85)'
  }, [])

  const pointAltitude = useCallback(() => 0.005, [])

  const pointRadius = useCallback((d: object) => {
    const pin = d as TrustPin
    if (pin.isRoot) return 0.4
    return 0.12
  }, [])

  // ── Arc-Accessors ──────────────────────────────────────────

  const arcColor = useCallback((d: object) => {
    const arc = d as ArcLink
    const alpha = Math.min(0.15 + arc.strength * 0.08, 0.7)
    return [`rgba(180, 210, 255, ${alpha})`, `rgba(140, 180, 255, ${alpha})`]
  }, [])

  const arcAltitude = useCallback((d: object) => {
    const arc = d as ArcLink
    const dlat = arc.startLat - arc.endLat
    const dlng = arc.startLng - arc.endLng
    const dist = Math.sqrt(dlat * dlat + dlng * dlng)
    return 0.04 + (dist / 360) * 0.35
  }, [])

  const arcStroke = useCallback((d: object) => {
    const arc = d as ArcLink
    return 0.2 + Math.sqrt(arc.strength) * 0.3
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: '#000010',
      }}
      onClick={() => setSelectedPin(null)}
    >
      <Globe
        ref={globeRef}
        width={window.innerWidth}
        height={window.innerHeight}

        // Globus-Aussehen
        globeImageUrl={EARTH_NIGHT}
        bumpImageUrl={EARTH_TOPOLOGY}
        backgroundImageUrl={NIGHT_SKY}
        showAtmosphere={true}
        atmosphereColor="#4466aa"
        atmosphereAltitude={0.15}

        // ECHTE Pins (dieselben wie auf der Leaflet-Karte!)
        pointsData={filteredPins}
        pointLat="lat"
        pointLng="lng"
        pointColor={pointColor}
        pointAltitude={pointAltitude}
        pointRadius={pointRadius}
        pointResolution={12}
        pointsMerge={false}
        pointLabel={pointLabel}
        pointsTransitionDuration={800}
        onPointClick={handlePointClick}

        // Verbindungsbögen (ECHTE Onboarding-Verbindungen zwischen Clustern)
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={arcColor}
        arcAltitude={arcAltitude}
        arcStroke={arcStroke}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={4000}
        arcCurveResolution={64}
        arcsTransitionDuration={800}

        // Interaktion AKTIV
        enablePointerInteraction={true}
        onGlobeReady={handleGlobeReady}
      />

      {/* Pin-Info Popup */}
      {selectedPin && (
        <PinPopup
          pin={selectedPin}
          connections={connections}
          allPins={pinMap}
          onClose={() => {
            setSelectedPin(null)
            // Auto-Rotate wieder starten
            const globe = globeRef.current
            if (globe) {
              const controls = globe.controls()
              controls.autoRotate = true
            }
          }}
        />
      )}

      {/* Pin-Count Anzeige */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
        🌍 {filteredPins.length.toLocaleString()} Pins · {arcs.length} Verbindungen · Klick auf einen Pin für Details
      </div>
    </div>
  )
}
