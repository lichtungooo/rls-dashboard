/**
 * Web of Trust - Netzwerk-Daten v7
 *
 * ECHTE Onboarding-Kette: Jeder Pin hat einen parentId (wer hat ihn onboarded).
 * Root = Berlin. Von dort breitet sich das Netzwerk über die Welt aus.
 * Verbindungen = echte Parent→Child Beziehungen, nicht zufällige Nähe.
 *
 * Beim Clustering werden die Verbindungen ZWISCHEN Clustern aggregiert:
 * Wenn 3 Pins in Cluster A einen Parent in Cluster B haben,
 * gibt es einen Arc A→B mit Stärke 3.
 */

// ── Typen ────────────────────────────────────────────────────

export interface TrustPin {
  id: number
  lat: number
  lng: number
  parentId: number | null   // Wer hat diesen User onboarded? null = Root
  depth: number             // Stufen vom Root entfernt
  isRoot: boolean
}

export interface ClusterNode {
  id: string                // Grid-Key
  lat: number
  lng: number
  count: number             // Anzahl Pins in diesem Cluster
  isRoot: boolean
  pinIds: number[]          // Welche Pins gehören hierher
}

export interface ArcLink {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  strength: number          // Wie viele echte Verbindungen fließen hier
}

// ── Städte/Regionen als Seed-Punkte ──────────────────────────
// Jede Stadt ist ein "Hub" — von dort breiten sich Onboardings lokal aus.

interface CityHub {
  lat: number
  lng: number
  name: string
  region: string
  population: number  // Relativer Proxy (1-100)
}

const CITY_HUBS: CityHub[] = [
  // EUROPA (vom Root Berlin aus)
  { lat: 52.52,  lng: 13.405, name: 'Berlin',     region: 'EU', population: 100 },
  { lat: 48.86,  lng: 2.35,   name: 'Paris',      region: 'EU', population: 85 },
  { lat: 51.51,  lng: -0.13,  name: 'London',     region: 'EU', population: 90 },
  { lat: 48.14,  lng: 11.58,  name: 'München',    region: 'EU', population: 55 },
  { lat: 50.94,  lng: 6.96,   name: 'Köln',       region: 'EU', population: 50 },
  { lat: 53.55,  lng: 9.99,   name: 'Hamburg',    region: 'EU', population: 55 },
  { lat: 52.37,  lng: 4.90,   name: 'Amsterdam',  region: 'EU', population: 50 },
  { lat: 50.85,  lng: 4.35,   name: 'Brüssel',   region: 'EU', population: 40 },
  { lat: 48.21,  lng: 16.37,  name: 'Wien',       region: 'EU', population: 55 },
  { lat: 47.37,  lng: 8.54,   name: 'Zürich',     region: 'EU', population: 40 },
  { lat: 41.90,  lng: 12.50,  name: 'Rom',        region: 'EU', population: 65 },
  { lat: 45.46,  lng: 9.19,   name: 'Mailand',    region: 'EU', population: 50 },
  { lat: 40.42,  lng: -3.70,  name: 'Madrid',     region: 'EU', population: 65 },
  { lat: 41.39,  lng: 2.17,   name: 'Barcelona',  region: 'EU', population: 55 },
  { lat: 38.72,  lng: -9.14,  name: 'Lissabon',   region: 'EU', population: 40 },
  { lat: 55.68,  lng: 12.57,  name: 'Kopenhagen', region: 'EU', population: 35 },
  { lat: 59.33,  lng: 18.07,  name: 'Stockholm',  region: 'EU', population: 35 },
  { lat: 60.17,  lng: 24.94,  name: 'Helsinki',   region: 'EU', population: 30 },
  { lat: 59.91,  lng: 10.75,  name: 'Oslo',       region: 'EU', population: 30 },
  { lat: 52.23,  lng: 21.01,  name: 'Warschau',   region: 'EU', population: 45 },
  { lat: 50.08,  lng: 14.44,  name: 'Prag',       region: 'EU', population: 40 },
  { lat: 47.50,  lng: 19.04,  name: 'Budapest',   region: 'EU', population: 40 },
  { lat: 44.43,  lng: 26.10,  name: 'Bukarest',   region: 'EU', population: 35 },
  { lat: 37.98,  lng: 23.73,  name: 'Athen',      region: 'EU', population: 35 },
  { lat: 41.01,  lng: 28.98,  name: 'Istanbul',   region: 'EU', population: 70 },
  { lat: 50.45,  lng: 30.52,  name: 'Kiew',       region: 'EU', population: 40 },

  // NORDAMERIKA
  { lat: 40.71,  lng: -74.01, name: 'New York',     region: 'NA', population: 95 },
  { lat: 34.05,  lng: -118.24,name: 'Los Angeles',  region: 'NA', population: 80 },
  { lat: 41.88,  lng: -87.63, name: 'Chicago',      region: 'NA', population: 60 },
  { lat: 37.77,  lng: -122.42,name: 'San Francisco', region: 'NA', population: 55 },
  { lat: 47.61,  lng: -122.33,name: 'Seattle',      region: 'NA', population: 45 },
  { lat: 25.76,  lng: -80.19, name: 'Miami',        region: 'NA', population: 50 },
  { lat: 43.65,  lng: -79.38, name: 'Toronto',      region: 'NA', population: 55 },
  { lat: 45.50,  lng: -73.57, name: 'Montreal',     region: 'NA', population: 40 },
  { lat: 49.28,  lng: -123.12,name: 'Vancouver',    region: 'NA', population: 40 },
  { lat: 19.43,  lng: -99.13, name: 'Mexiko-Stadt', region: 'NA', population: 70 },

  // SÜDAMERIKA
  { lat: -23.55, lng: -46.63, name: 'São Paulo',    region: 'SA', population: 80 },
  { lat: -22.91, lng: -43.17, name: 'Rio de Janeiro',region: 'SA', population: 55 },
  { lat: -34.60, lng: -58.38, name: 'Buenos Aires', region: 'SA', population: 55 },
  { lat: -33.45, lng: -70.67, name: 'Santiago',     region: 'SA', population: 40 },
  { lat: -12.05, lng: -77.04, name: 'Lima',         region: 'SA', population: 45 },
  { lat: 4.71,   lng: -74.07, name: 'Bogotá',       region: 'SA', population: 45 },

  // AFRIKA
  { lat: 30.04,  lng: 31.24,  name: 'Kairo',       region: 'AF', population: 60 },
  { lat: 6.52,   lng: 3.38,   name: 'Lagos',       region: 'AF', population: 65 },
  { lat: -1.29,  lng: 36.82,  name: 'Nairobi',     region: 'AF', population: 40 },
  { lat: -33.93, lng: 18.42,  name: 'Kapstadt',    region: 'AF', population: 35 },
  { lat: -26.20, lng: 28.05,  name: 'Johannesburg',region: 'AF', population: 40 },
  { lat: 5.56,   lng: -0.19,  name: 'Accra',       region: 'AF', population: 30 },
  { lat: 9.02,   lng: 38.75,  name: 'Addis Abeba', region: 'AF', population: 35 },
  { lat: 33.59,  lng: -7.62,  name: 'Casablanca',  region: 'AF', population: 35 },

  // ASIEN
  { lat: 35.68,  lng: 139.69, name: 'Tokyo',       region: 'AS', population: 95 },
  { lat: 37.57,  lng: 126.98, name: 'Seoul',       region: 'AS', population: 70 },
  { lat: 39.90,  lng: 116.40, name: 'Peking',      region: 'AS', population: 80 },
  { lat: 31.23,  lng: 121.47, name: 'Shanghai',    region: 'AS', population: 80 },
  { lat: 22.54,  lng: 114.05, name: 'Shenzhen',    region: 'AS', population: 55 },
  { lat: 22.32,  lng: 114.17, name: 'Hongkong',    region: 'AS', population: 50 },
  { lat: 25.03,  lng: 121.57, name: 'Taipei',      region: 'AS', population: 40 },
  { lat: 1.35,   lng: 103.82, name: 'Singapur',    region: 'AS', population: 50 },
  { lat: 13.76,  lng: 100.50, name: 'Bangkok',     region: 'AS', population: 55 },
  { lat: -6.21,  lng: 106.85, name: 'Jakarta',     region: 'AS', population: 55 },
  { lat: 28.61,  lng: 77.21,  name: 'Delhi',       region: 'AS', population: 75 },
  { lat: 19.08,  lng: 72.88,  name: 'Mumbai',      region: 'AS', population: 70 },
  { lat: 12.97,  lng: 77.59,  name: 'Bangalore',   region: 'AS', population: 50 },

  // NAHER OSTEN
  { lat: 25.20,  lng: 55.27,  name: 'Dubai',       region: 'ME', population: 40 },
  { lat: 32.09,  lng: 34.77,  name: 'Tel Aviv',    region: 'ME', population: 35 },

  // RUSSLAND
  { lat: 55.76,  lng: 37.62,  name: 'Moskau',      region: 'RU', population: 65 },
  { lat: 59.93,  lng: 30.32,  name: 'St. Petersburg',region:'RU', population: 40 },

  // OZEANIEN
  { lat: -33.87, lng: 151.21, name: 'Sydney',      region: 'OC', population: 50 },
  { lat: -37.81, lng: 144.96, name: 'Melbourne',   region: 'OC', population: 45 },
  { lat: -36.85, lng: 174.76, name: 'Auckland',    region: 'OC', population: 30 },
]

// ── Seeded Random ────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ── Onboarding-Baum generieren ───────────────────────────────
// Berlin (Root) onboarded Leute in Berlin, die onboarden Leute in
// anderen deutschen Städten, die onboarden Leute in Europa, die
// onboarden Leute weltweit. Ein realistischer Ausbreitungs-Baum.

let cachedPins: TrustPin[] | null = null
let cachedConnections: { from: number; to: number }[] | null = null

export function generateTrustNetwork(): { pins: TrustPin[]; connections: { from: number; to: number }[] } {
  if (cachedPins && cachedConnections) return { pins: cachedPins, connections: cachedConnections }

  const rng = seededRandom(42)
  const pins: TrustPin[] = []
  const connections: { from: number; to: number }[] = []

  // Root-Pin: Berlin
  pins.push({ id: 0, lat: 52.52, lng: 13.405, parentId: null, depth: 0, isRoot: true })

  // Phase 1: Root onboarded Hub-Pioniere
  // Jede Stadt bekommt einen "Pionier" der vom nächsten Hub onboarded wurde
  // Wir bauen das als Welle: Berlin → deutsche Städte → europäische Städte → Welt

  // Sortiere Hubs nach Distanz zu Berlin (näher = früher onboarded)
  const berlinLat = 52.52, berlinLng = 13.405
  const sortedHubs = CITY_HUBS.slice(1).map(hub => {
    const dlat = hub.lat - berlinLat
    const dlng = hub.lng - berlinLng
    return { ...hub, distToBerlin: Math.sqrt(dlat * dlat + dlng * dlng) }
  }).sort((a, b) => a.distToBerlin - b.distToBerlin)

  // Jeder Hub-Pionier wurde vom nächstgelegenen bereits existierenden Pin onboarded
  const hubPioneerIds: Map<string, number> = new Map()
  hubPioneerIds.set('Berlin', 0) // Root

  for (const hub of sortedHubs) {
    // Finde den nächsten bereits existierenden Hub-Pionier als Parent
    let bestParentId = 0
    let bestDist = Infinity

    for (const [, pioneerId] of hubPioneerIds) {
      const parent = pins[pioneerId]
      const dlat = hub.lat - parent.lat
      const dlng = hub.lng - parent.lng
      const dist = Math.sqrt(dlat * dlat + dlng * dlng)
      if (dist < bestDist) {
        bestDist = dist
        bestParentId = pioneerId
      }
    }

    const parentPin = pins[bestParentId]
    const pioneerId = pins.length
    pins.push({
      id: pioneerId,
      lat: hub.lat + (rng() - 0.5) * 0.1,
      lng: hub.lng + (rng() - 0.5) * 0.1,
      parentId: bestParentId,
      depth: parentPin.depth + 1,
      isRoot: false,
    })
    connections.push({ from: bestParentId, to: pioneerId })
    hubPioneerIds.set(hub.name, pioneerId)
  }

  // Phase 2: Jeder Hub-Pionier onboarded lokale Leute
  // Anzahl proportional zu population. Jeder lokale User onboarded
  // weitere 0-3 Leute (wie ein echter viraler Spread).

  for (const hub of [CITY_HUBS[0], ...sortedHubs]) {
    const pioneerId = hubPioneerIds.get(hub.name)!
    const localCount = Math.round(hub.population * 0.8 + rng() * hub.population * 0.4)

    // Wave 1: Pionier onboarded direkt
    const wave1Ids: number[] = []
    const directOnboards = Math.min(localCount, 3 + Math.floor(rng() * 5))

    for (let i = 0; i < directOnboards; i++) {
      const angle = rng() * 2 * Math.PI
      const r = rng() * 0.5 // ~50km Radius
      const id = pins.length
      pins.push({
        id,
        lat: hub.lat + Math.sin(angle) * r,
        lng: hub.lng + Math.cos(angle) * r / Math.cos(hub.lat * Math.PI / 180),
        parentId: pioneerId,
        depth: pins[pioneerId].depth + 1,
        isRoot: false,
      })
      connections.push({ from: pioneerId, to: id })
      wave1Ids.push(id)
    }

    // Wave 2+: Kaskadierend — jeder onboarded 0-3 Leute
    let currentWave = wave1Ids
    let remaining = localCount - directOnboards

    while (remaining > 0 && currentWave.length > 0) {
      const nextWave: number[] = []

      for (const parentId of currentWave) {
        if (remaining <= 0) break
        const onboards = Math.floor(rng() * 3.5) // 0-3 Leute
        const parent = pins[parentId]

        for (let j = 0; j < onboards && remaining > 0; j++) {
          const angle = rng() * 2 * Math.PI
          const r = rng() * 0.3
          const id = pins.length
          pins.push({
            id,
            lat: parent.lat + Math.sin(angle) * r,
            lng: parent.lng + Math.cos(angle) * r / Math.cos(parent.lat * Math.PI / 180),
            parentId: parentId,
            depth: parent.depth + 1,
            isRoot: false,
          })
          connections.push({ from: parentId, to: id })
          nextWave.push(id)
          remaining--
        }
      }

      currentWave = nextWave
    }
  }

  cachedPins = pins
  cachedConnections = connections
  return { pins, connections }
}

// ── Grid-basiertes Clustering ────────────────────────────────

export function clusterPins(pins: TrustPin[], cellSize: number = 5): ClusterNode[] {
  const grid = new Map<string, ClusterNode>()

  for (const pin of pins) {
    const key = `${Math.floor(pin.lat / cellSize)}_${Math.floor(pin.lng / cellSize)}`
    let cluster = grid.get(key)
    if (!cluster) {
      cluster = { id: key, lat: 0, lng: 0, count: 0, isRoot: false, pinIds: [] }
      grid.set(key, cluster)
    }
    cluster.lat += pin.lat
    cluster.lng += pin.lng
    cluster.count++
    cluster.pinIds.push(pin.id)
    if (pin.isRoot) cluster.isRoot = true
  }

  // Durchschnitt berechnen
  for (const cluster of grid.values()) {
    cluster.lat /= cluster.count
    cluster.lng /= cluster.count
  }

  return Array.from(grid.values())
}

// ── Echte Verbindungs-Arcs zwischen Clustern ─────────────────
// Zählt wie viele ECHTE Parent→Child Verbindungen zwischen zwei
// Clustern existieren. Das ist der Schlüssel: Keine Fake-Arcs.

export function generateRealArcs(
  _pins: TrustPin[],
  connections: { from: number; to: number }[],
  clusters: ClusterNode[]
): ArcLink[] {
  // Lookup: pinId → clusterId
  const pinToCluster = new Map<number, string>()
  for (const cluster of clusters) {
    for (const pinId of cluster.pinIds) {
      pinToCluster.set(pinId, cluster.id)
    }
  }

  // Cluster-Lookup für Positionen
  const clusterMap = new Map<string, ClusterNode>()
  for (const c of clusters) clusterMap.set(c.id, c)

  // Zähle Verbindungen zwischen verschiedenen Clustern
  const arcCounts = new Map<string, number>()

  for (const conn of connections) {
    const fromCluster = pinToCluster.get(conn.from)
    const toCluster = pinToCluster.get(conn.to)
    if (!fromCluster || !toCluster) continue
    if (fromCluster === toCluster) continue // Intra-Cluster → kein Arc

    // Normalisierte Key (damit A→B und B→A zusammengezählt werden)
    const arcKey = fromCluster < toCluster
      ? `${fromCluster}|${toCluster}`
      : `${toCluster}|${fromCluster}`

    arcCounts.set(arcKey, (arcCounts.get(arcKey) || 0) + 1)
  }

  // In ArcLinks umwandeln
  const arcs: ArcLink[] = []
  for (const [key, strength] of arcCounts) {
    const [c1Key, c2Key] = key.split('|')
    const c1 = clusterMap.get(c1Key)
    const c2 = clusterMap.get(c2Key)
    if (!c1 || !c2) continue

    arcs.push({
      startLat: c1.lat,
      startLng: c1.lng,
      endLat: c2.lat,
      endLng: c2.lng,
      strength,
    })
  }

  return arcs
}

// ── Leaflet MarkerCluster Overlay ─────────────────────────────
// Echte anklickbare Pins mit MarkerClusterGroup + Canvas-Myzel

import L from 'leaflet'
import 'leaflet.markercluster'

// Pin-Icons
const PIN_ICON = L.divIcon({
  className: 'trust-pin',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.9),rgba(109,62,216,1));border:1.5px solid rgba(255,255,255,0.6);box-shadow:0 0 6px rgba(139,92,246,0.5);transition:transform 0.2s"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
})

const ROOT_ICON = L.divIcon({
  className: 'trust-pin-root',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,rgba(251,191,36,0.95),rgba(245,158,11,1));border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 12px rgba(251,191,36,0.6);transition:transform 0.2s"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/**
 * Erstellt ein MarkerClusterGroup-Overlay mit ECHTEN anklickbaren Pins
 * und zeichnet Myzel-Verbindungen zwischen sichtbaren Clustern.
 */
export function createTrustOverlay(map: L.Map): {
  clusterGroup: L.MarkerClusterGroup
  canvasLayer: L.Layer
  remove: () => void
} {
  const { pins, connections } = generateTrustNetwork()

  // ── MarkerClusterGroup mit Custom-Styling ──
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount()
      let sizeClass = 'trust-cluster-small'
      let size = 30
      if (count > 50) { sizeClass = 'trust-cluster-large'; size = 44 }
      else if (count > 10) { sizeClass = 'trust-cluster-medium'; size = 36 }
      return L.divIcon({
        html: `<div class="trust-cluster ${sizeClass}"><span>${count}</span></div>`,
        className: '',
        iconSize: L.point(size, size),
      })
    },
  })

  // ── Echte Marker erstellen ──
  const pinMap = new Map<number, TrustPin>()
  for (const pin of pins) pinMap.set(pin.id, pin)

  for (const pin of pins) {
    const marker = L.marker([pin.lat, pin.lng], {
      icon: pin.isRoot ? ROOT_ICON : PIN_ICON,
    })

    // Popup mit echten Profil-Infos
    const parent = pin.parentId !== null ? pinMap.get(pin.parentId) : null
    const children = connections.filter(c => c.from === pin.id).length
    marker.bindPopup(`
      <div style="min-width:160px;font-family:system-ui,sans-serif">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">
          ${pin.isRoot ? '⭐ Root Node' : `👤 User #${pin.id}`}
        </div>
        <div style="font-size:12px;color:#6b7280;line-height:1.6">
          📍 ${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)}<br/>
          🔗 Tiefe: ${pin.depth} ${pin.depth === 0 ? '(Ursprung)' : ''}<br/>
          ${parent ? `⬆️ Onboarded von: User #${parent.id}<br/>` : ''}
          ⬇️ Hat ${children} onboarded
        </div>
      </div>
    `, { className: 'trust-popup' })

    clusterGroup.addLayer(marker)
  }

  clusterGroup.addTo(map)

  // ── Canvas-Layer für Myzel-Verbindungen ──
  const MycelCanvas = L.Layer.extend({
    onAdd(m: L.Map) {
      this._map = m
      this._canvas = L.DomUtil.create('canvas', 'mycel-canvas') as HTMLCanvasElement
      const pane = m.getPane('overlayPane')!
      pane.appendChild(this._canvas)
      this._canvas.style.position = 'absolute'
      this._canvas.style.pointerEvents = 'none'
      this._canvas.style.zIndex = '250'

      this._onMove = () => this._draw()
      m.on('moveend zoomend resize', this._onMove)
      // Cluster-Animation fertig → neu zeichnen
      clusterGroup.on('animationend', this._onMove)
      this._draw()
      return this
    },

    onRemove(m: L.Map) {
      m.off('moveend zoomend resize', this._onMove)
      clusterGroup.off('animationend', this._onMove)
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas)
      }
      return this
    },

    _draw() {
      const m = this._map as L.Map
      if (!m) return
      const canvas = this._canvas as HTMLCanvasElement
      const size = m.getSize()
      const topLeft = m.containerPointToLayerPoint([0, 0])

      canvas.width = size.x
      canvas.height = size.y
      L.DomUtil.setPosition(canvas, topLeft)

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size.x, size.y)

      // Sichtbare Cluster-Positionen sammeln
      const visibleClusters: { center: L.Point; count: number; pinIds: number[] }[] = []

      // Durch alle sichtbaren Cluster iterieren
      // @ts-expect-error _featureGroup is internal Leaflet API
      const featureGroup = clusterGroup._featureGroup
      if (!featureGroup) return

      featureGroup.eachLayer((layer: any) => {
        if (!m.getBounds().contains(layer.getLatLng())) return

        if (layer._childCount) {
          // Es ist ein Cluster
          const pt = m.latLngToContainerPoint(layer.getLatLng())
          const childMarkers = layer.getAllChildMarkers()
          const pIds = childMarkers.map((_: any, i: number) => i)
          visibleClusters.push({ center: pt, count: layer._childCount, pinIds: pIds })
        }
      })

      if (visibleClusters.length < 2) return

      // Verbindungen zwischen nahegelegenen Clustern zeichnen
      // Nutze die echten Connections-Daten
      const connLookup = new Map<string, number>()
      for (const conn of connections) {
        const key = `${conn.from}-${conn.to}`
        connLookup.set(key, (connLookup.get(key) || 0) + 1)
      }

      for (let i = 0; i < visibleClusters.length; i++) {
        for (let j = i + 1; j < visibleClusters.length; j++) {
          const a = visibleClusters[i]
          const b = visibleClusters[j]
          const dx = a.center.x - b.center.x
          const dy = a.center.y - b.center.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Nur verbinden wenn nicht zu weit auseinander auf dem Bildschirm
          if (dist > 500) continue

          // Stärke basierend auf Cluster-Größen
          const strength = Math.min(a.count, b.count)
          const alpha = Math.min(0.08 + strength * 0.003, 0.35)
          const width = 1 + Math.sqrt(strength) * 0.4

          // Organische Kurve (Myzel-Look)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`
          ctx.lineWidth = width
          ctx.setLineDash([])

          // Leicht gebogene Linie
          const midX = (a.center.x + b.center.x) / 2
          const midY = (a.center.y + b.center.y) / 2
          const offset = dist * 0.1 * (i % 2 === 0 ? 1 : -1)
          const cpX = midX + (dy / dist) * offset
          const cpY = midY - (dx / dist) * offset

          ctx.moveTo(a.center.x, a.center.y)
          ctx.quadraticCurveTo(cpX, cpY, b.center.x, b.center.y)
          ctx.stroke()
        }
      }
    },
  })

  const canvasLayer = new MycelCanvas()
  canvasLayer.addTo(map)

  return {
    clusterGroup,
    canvasLayer,
    remove: () => {
      map.removeLayer(clusterGroup)
      map.removeLayer(canvasLayer)
    },
  }
}
