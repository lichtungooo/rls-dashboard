/**
 * Web of Trust - Netzwerk-Visualisierung
 *
 * Simuliert 10.000 Menschen als Onboarding-Baum:
 * - Jeder Mensch hat einen "Einlader" (parent)
 * - Verbindungslinien zwischen Einlader und Eingeladenen
 * - Liniendicke reagiert auf Zoom-Level (dicker = weiter raus)
 * - Modus: "alle" oder "mein Netzwerk" (eigener Teilbaum)
 */

import L from 'leaflet'

// ── Typen ────────────────────────────────────────────────────

export interface TrustNode {
  id: number
  lat: number
  lng: number
  parentId: number | null   // null = "Ich" (Root)
  depth: number             // Tiefe im Baum (0 = Ich)
  name: string
}

// ── Zufalls-Hilfsfunktionen ──────────────────────────────────

// Seeded pseudo-random (deterministisch, damit das Netz immer gleich aussieht)
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// Gauss-ähnliche Verteilung um einen Punkt (km → Grad)
function randomNearby(rng: () => number, lat: number, lng: number, radiusKm: number): [number, number] {
  const km_per_deg_lat = 111
  const km_per_deg_lng = 111 * Math.cos((lat * Math.PI) / 180)
  const angle = rng() * 2 * Math.PI
  const r = Math.sqrt(rng()) * radiusKm // sqrt für gleichmäßige Flächenverteilung
  return [
    lat + (r * Math.sin(angle)) / km_per_deg_lat,
    lng + (r * Math.cos(angle)) / km_per_deg_lng,
  ]
}

// Zufälliger Vorname für Tooltips
const NAMES = ['Anna', 'Ben', 'Clara', 'David', 'Emma', 'Felix', 'Greta', 'Hans', 'Ida', 'Jonas',
  'Klara', 'Leon', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rosa', 'Sam', 'Tina',
  'Uwe', 'Vera', 'Willi', 'Xena', 'Yara', 'Zoe', 'Alex', 'Bea', 'Chris', 'Dana']

// ── Netzwerk generieren ──────────────────────────────────────

const TOTAL_NODES = 10_000

// Globale Verteilung: Hauptzentren (Cluster)
const CLUSTERS: Array<{ lat: number; lng: number; weight: number }> = [
  { lat: 52.52,  lng: 13.41,  weight: 0.25 }, // Berlin
  { lat: 48.14,  lng: 11.58,  weight: 0.15 }, // München
  { lat: 51.51,  lng: -0.13,  weight: 0.12 }, // London
  { lat: 48.85,  lng: 2.35,   weight: 0.10 }, // Paris
  { lat: 40.71,  lng: -74.01, weight: 0.08 }, // New York
  { lat: 35.68,  lng: 139.69, weight: 0.07 }, // Tokyo
  { lat: -33.87, lng: 151.21, weight: 0.05 }, // Sydney
  { lat: 19.07,  lng: 72.88,  weight: 0.05 }, // Mumbai
  { lat: -23.55, lng: -46.63, weight: 0.05 }, // São Paulo
  { lat: 1.35,   lng: 103.82, weight: 0.04 }, // Singapur
  { lat: 55.75,  lng: 37.62,  weight: 0.04 }, // Moskau
]

let cachedNodes: TrustNode[] | null = null

export function generateTrustNetwork(): TrustNode[] {
  if (cachedNodes) return cachedNodes

  const rng = seededRandom(42)
  const nodes: TrustNode[] = []

  // Root = "Ich" → Berlin Mitte
  nodes.push({
    id: 0,
    lat: 52.52,
    lng: 13.405,
    parentId: null,
    depth: 0,
    name: 'Ich',
  })

  // Kumulierte Gewichte für Cluster-Auswahl
  const cumWeights = CLUSTERS.reduce<number[]>((acc, c, i) => {
    acc.push((acc[i - 1] ?? 0) + c.weight)
    return acc
  }, [])

  for (let i = 1; i < TOTAL_NODES; i++) {
    // Zufälliger Parent aus bereits existierenden Nodes
    // Näher am Root → höhere Chance (Baum-Wachstum von oben)
    // Einfache Heuristik: Parent-ID zufällig, aber bevorzugt kleiner
    const parentIdx = Math.floor(Math.pow(rng(), 1.5) * i)
    const parent = nodes[parentIdx]

    // Cluster auswählen (oder in der Nähe des Parents)
    let lat: number, lng: number
    if (rng() < 0.6) {
      // 60%: In der Nähe des Parents (lokales Onboarding)
      const radius = 5 + rng() * 50 // 5–55 km
      ;[lat, lng] = randomNearby(rng, parent.lat, parent.lng, radius)
    } else {
      // 40%: Zufälliger globaler Cluster
      const r = rng()
      const clusterIdx = cumWeights.findIndex(w => r <= w)
      const cluster = CLUSTERS[Math.max(0, clusterIdx)]
      ;[lat, lng] = randomNearby(rng, cluster.lat, cluster.lng, 50 + rng() * 200)
    }

    // Lat/Lng auf Weltgrenzen begrenzen
    lat = Math.max(-85, Math.min(85, lat))
    lng = ((lng + 180) % 360) - 180

    nodes.push({
      id: i,
      lat,
      lng,
      parentId: parent.id,
      depth: parent.depth + 1,
      name: NAMES[Math.floor(rng() * NAMES.length)] + ' ' + i,
    })
  }

  cachedNodes = nodes
  return nodes
}

// ── Farb-Schema nach Tiefe ────────────────────────────────────

function depthColor(depth: number, alpha: number): string {
  // Tiefe 0-1: Lila/Violett, 2-3: Blau, 4-5: Türkis, 6+: Grün
  if (depth <= 1) return `rgba(139, 92, 246, ${alpha})`   // lila
  if (depth <= 3) return `rgba(59, 130, 246, ${alpha})`   // blau
  if (depth <= 5) return `rgba(20, 184, 166, ${alpha})`   // türkis
  return `rgba(34, 197, 94, ${alpha})`                     // grün
}

// ── Leaflet-Overlay-Klasse ────────────────────────────────────

export class TrustNetworkOverlay extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private nodes: TrustNode[]
  private mode: 'all' | 'my'
  private mySubtreeIds: Set<number>
  private _map: L.Map | null = null

  constructor(nodes: TrustNode[], mode: 'all' | 'my') {
    super()
    this.nodes = nodes
    this.mode = mode
    this.mySubtreeIds = this._buildSubtree(0) // Teilbaum ab "Ich" (id=0)
  }

  private _buildSubtree(rootId: number): Set<number> {
    const set = new Set<number>()
    const queue = [rootId]
    while (queue.length) {
      const id = queue.shift()!
      set.add(id)
      this.nodes.forEach(n => {
        if (n.parentId === id) queue.push(n.id)
      })
    }
    return set
  }

  onAdd(map: L.Map): this {
    this._map = map
    const pane = map.getPane('overlayPane')!
    this.canvas = L.DomUtil.create('canvas', 'trust-network-canvas', pane) as HTMLCanvasElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'
    this._resize()
    this._draw()
    map.on('moveend zoomend viewreset', this._onMapChange, this)
    map.on('zoom', this._onZoom, this)
    return this
  }

  onRemove(map: L.Map): this {
    map.off('moveend zoomend viewreset', this._onMapChange, this)
    map.off('zoom', this._onZoom, this)
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
    this.canvas = null
    this._map = null
    return this
  }

  setMode(mode: 'all' | 'my') {
    this.mode = mode
    this._draw()
  }

  private _onMapChange() {
    this._resize()
    this._draw()
  }

  private _onZoom() {
    this._resize()
    this._draw()
  }

  private _resize() {
    if (!this._map || !this.canvas) return
    const size = this._map.getSize()
    this.canvas.width = size.x
    this.canvas.height = size.y
    // Canvas-Position an Map-Pane-Offset anpassen
    const offset = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, offset)
  }

  private _draw() {
    if (!this._map || !this.canvas) return
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const map = this._map
    const zoom = map.getZoom()
    const size = map.getSize()
    ctx.clearRect(0, 0, size.x, size.y)

    // Liniendicke: bei Zoom 2 → 4px, bei Zoom 10 → 1px, bei Zoom 15 → 0.4px
    // Je weiter raus, desto dicker (geclusterte Straßen-Wirkung)
    const baseWidth = Math.max(0.3, Math.min(6, 30 / Math.pow(2, zoom * 0.6)))
    const baseAlpha = Math.max(0.1, Math.min(0.8, 0.5 - zoom * 0.02))

    const activeNodes = this.mode === 'my'
      ? this.nodes.filter(n => this.mySubtreeIds.has(n.id))
      : this.nodes

    // Aktive Node-IDs für schnellen Lookup
    const activeIds = new Set(activeNodes.map(n => n.id))

    // Karte Viewport-Bounds mit etwas Puffer
    const bounds = map.getBounds().pad(0.1)

    // Linien zeichnen (Eltern → Kind)
    ctx.lineCap = 'round'
    for (const node of activeNodes) {
      if (node.parentId === null) continue
      if (!activeIds.has(node.parentId)) continue

      const parent = this.nodes[node.parentId]

      // Mindestens einer der Punkte muss im Viewport sein (Performance)
      const nodeInView = bounds.contains([node.lat, node.lng])
      const parentInView = bounds.contains([parent.lat, parent.lng])
      if (!nodeInView && !parentInView) continue

      const p1 = map.latLngToContainerPoint([parent.lat, parent.lng])
      const p2 = map.latLngToContainerPoint([node.lat, node.lng])

      const color = depthColor(node.depth, baseAlpha)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = color
      ctx.lineWidth = baseWidth * Math.max(0.3, 1 - node.depth * 0.08)
      ctx.stroke()
    }

    // Punkte zeichnen (nur wenn reingezoomed, sonst zu viele)
    if (zoom >= 5) {
      const dotSize = Math.max(1.5, Math.min(5, zoom * 0.4 - 1))
      for (const node of activeNodes) {
        if (!bounds.contains([node.lat, node.lng])) continue
        const p = map.latLngToContainerPoint([node.lat, node.lng])
        const isMe = node.id === 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, isMe ? dotSize * 2.5 : dotSize, 0, Math.PI * 2)
        ctx.fillStyle = isMe ? '#f59e0b' : depthColor(node.depth, 0.9)
        ctx.fill()
      }
    }

    // "Ich"-Marker immer sichtbar
    const me = this.nodes[0]
    const mePoint = map.latLngToContainerPoint([me.lat, me.lng])
    ctx.beginPath()
    ctx.arc(mePoint.x, mePoint.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2.5
    ctx.stroke()
  }
}
