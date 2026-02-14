/**
 * Web of Trust - MYZEL Netzwerk-Visualisierung
 *
 * Zoom-basiertes Clustering mit leuchtenden Licht-Knoten:
 * - Zoom 1-3:  Kontinente  (6 riesige Knotenpunkte, maximale Helligkeit)
 * - Zoom 4-5:  Länder      (~50 Knoten)
 * - Zoom 6-8:  Städte      (~200 Knoten)
 * - Zoom 9+:   Personen    (individuelle Pins, kleine Lichter)
 *
 * Jeder Knoten glüht wie ein Licht — je größer der Cluster, desto heller.
 * Verbindungslinien: weiß/hell mit Transparenz, dicker beim Rauszoomen.
 */

import L from 'leaflet'

// ── Daten-Typen ──────────────────────────────────────────────

export interface CityNode {
  id: number
  name: string
  lat: number
  lng: number
  continent: number   // 0-5
  country: string
  population: number  // relative Größe (100-10000)
  parentId: number | null
  depth: number
}

// ── Kontinent-Zentren ────────────────────────────────────────

const CONTINENTS = [
  { id: 0, name: 'Europa',        lat: 50.0,   lng: 10.0,   color: '#a78bfa' }, // violett
  { id: 1, name: 'Nordamerika',   lat: 40.0,   lng: -95.0,  color: '#60a5fa' }, // blau
  { id: 2, name: 'Südamerika',    lat: -15.0,  lng: -55.0,  color: '#34d399' }, // grün
  { id: 3, name: 'Afrika',        lat: 5.0,    lng: 20.0,   color: '#f59e0b' }, // gold
  { id: 4, name: 'Asien',         lat: 35.0,   lng: 100.0,  color: '#f87171' }, // rot
  { id: 5, name: 'Ozeanien',      lat: -25.0,  lng: 135.0,  color: '#2dd4bf' }, // türkis
]

// ── Städte-Daten ─────────────────────────────────────────────

const CITIES: Omit<CityNode, 'parentId' | 'depth'>[] = [
  // === EUROPA ===
  { id: 1,  name: 'Berlin',        lat: 52.52,  lng: 13.41,  continent: 0, country: 'DE', population: 3700 },
  { id: 2,  name: 'Hamburg',       lat: 53.55,  lng: 10.00,  continent: 0, country: 'DE', population: 1800 },
  { id: 3,  name: 'München',       lat: 48.14,  lng: 11.58,  continent: 0, country: 'DE', population: 1500 },
  { id: 4,  name: 'Köln',          lat: 50.94,  lng: 6.96,   continent: 0, country: 'DE', population: 1000 },
  { id: 5,  name: 'Frankfurt',     lat: 50.11,  lng: 8.68,   continent: 0, country: 'DE', population: 800  },
  { id: 6,  name: 'Stuttgart',     lat: 48.78,  lng: 9.18,   continent: 0, country: 'DE', population: 600  },
  { id: 7,  name: 'Leipzig',       lat: 51.34,  lng: 12.38,  continent: 0, country: 'DE', population: 500  },
  { id: 8,  name: 'Wien',          lat: 48.21,  lng: 16.37,  continent: 0, country: 'AT', population: 1900 },
  { id: 9,  name: 'Zürich',        lat: 47.38,  lng: 8.54,   continent: 0, country: 'CH', population: 400  },
  { id: 10, name: 'London',        lat: 51.51,  lng: -0.13,  continent: 0, country: 'GB', population: 9000 },
  { id: 11, name: 'Manchester',    lat: 53.48,  lng: -2.24,  continent: 0, country: 'GB', population: 550  },
  { id: 12, name: 'Paris',         lat: 48.85,  lng: 2.35,   continent: 0, country: 'FR', population: 2200 },
  { id: 13, name: 'Lyon',          lat: 45.75,  lng: 4.83,   continent: 0, country: 'FR', population: 500  },
  { id: 14, name: 'Amsterdam',     lat: 52.37,  lng: 4.90,   continent: 0, country: 'NL', population: 870  },
  { id: 15, name: 'Brüssel',       lat: 50.85,  lng: 4.35,   continent: 0, country: 'BE', population: 1100 },
  { id: 16, name: 'Madrid',        lat: 40.42,  lng: -3.70,  continent: 0, country: 'ES', population: 3300 },
  { id: 17, name: 'Barcelona',     lat: 41.39,  lng: 2.16,   continent: 0, country: 'ES', population: 1600 },
  { id: 18, name: 'Rom',           lat: 41.90,  lng: 12.50,  continent: 0, country: 'IT', population: 2900 },
  { id: 19, name: 'Mailand',       lat: 45.46,  lng: 9.19,   continent: 0, country: 'IT', population: 1400 },
  { id: 20, name: 'Stockholm',     lat: 59.33,  lng: 18.07,  continent: 0, country: 'SE', population: 970  },
  { id: 21, name: 'Oslo',          lat: 59.91,  lng: 10.75,  continent: 0, country: 'NO', population: 690  },
  { id: 22, name: 'Kopenhagen',    lat: 55.68,  lng: 12.57,  continent: 0, country: 'DK', population: 800  },
  { id: 23, name: 'Helsinki',      lat: 60.17,  lng: 24.94,  continent: 0, country: 'FI', population: 650  },
  { id: 24, name: 'Warschau',      lat: 52.23,  lng: 21.01,  continent: 0, country: 'PL', population: 1800 },
  { id: 25, name: 'Prag',          lat: 50.08,  lng: 14.44,  continent: 0, country: 'CZ', population: 1300 },
  { id: 26, name: 'Budapest',      lat: 47.50,  lng: 19.04,  continent: 0, country: 'HU', population: 1750 },
  { id: 27, name: 'Lissabon',      lat: 38.72,  lng: -9.14,  continent: 0, country: 'PT', population: 500  },
  { id: 28, name: 'Athen',         lat: 37.98,  lng: 23.73,  continent: 0, country: 'GR', population: 660  },
  { id: 29, name: 'Istanbul',      lat: 41.01,  lng: 28.95,  continent: 0, country: 'TR', population: 1500 },
  { id: 30, name: 'Kiew',          lat: 50.45,  lng: 30.52,  continent: 0, country: 'UA', population: 2900 },

  // === NORDAMERIKA ===
  { id: 40, name: 'New York',      lat: 40.71,  lng: -74.01, continent: 1, country: 'US', population: 8300 },
  { id: 41, name: 'Los Angeles',   lat: 34.05,  lng: -118.24,continent: 1, country: 'US', population: 3900 },
  { id: 42, name: 'Chicago',       lat: 41.88,  lng: -87.63, continent: 1, country: 'US', population: 2700 },
  { id: 43, name: 'San Francisco', lat: 37.77,  lng: -122.42,continent: 1, country: 'US', population: 900  },
  { id: 44, name: 'Seattle',       lat: 47.61,  lng: -122.33,continent: 1, country: 'US', population: 760  },
  { id: 45, name: 'Austin',        lat: 30.27,  lng: -97.74, continent: 1, country: 'US', population: 960  },
  { id: 46, name: 'Boston',        lat: 42.36,  lng: -71.06, continent: 1, country: 'US', population: 690  },
  { id: 47, name: 'Miami',         lat: 25.77,  lng: -80.19, continent: 1, country: 'US', population: 470  },
  { id: 48, name: 'Toronto',       lat: 43.65,  lng: -79.38, continent: 1, country: 'CA', population: 2900 },
  { id: 49, name: 'Vancouver',     lat: 49.25,  lng: -123.12,continent: 1, country: 'CA', population: 680  },
  { id: 50, name: 'Montreal',      lat: 45.50,  lng: -73.57, continent: 1, country: 'CA', population: 1700 },
  { id: 51, name: 'Mexico City',   lat: 19.43,  lng: -99.13, continent: 1, country: 'MX', population: 2100 },

  // === SÜDAMERIKA ===
  { id: 60, name: 'São Paulo',     lat: -23.55, lng: -46.63, continent: 2, country: 'BR', population: 1200 },
  { id: 61, name: 'Rio de Janeiro',lat: -22.91, lng: -43.17, continent: 2, country: 'BR', population: 680  },
  { id: 62, name: 'Buenos Aires',  lat: -34.60, lng: -58.38, continent: 2, country: 'AR', population: 300  },
  { id: 63, name: 'Bogotá',        lat: 4.71,   lng: -74.07, continent: 2, country: 'CO', population: 200  },
  { id: 64, name: 'Lima',          lat: -12.05, lng: -77.04, continent: 2, country: 'PE', population: 180  },
  { id: 65, name: 'Santiago',      lat: -33.45, lng: -70.67, continent: 2, country: 'CL', population: 150  },

  // === AFRIKA ===
  { id: 70, name: 'Lagos',         lat: 6.52,   lng: 3.38,   continent: 3, country: 'NG', population: 500  },
  { id: 71, name: 'Nairobi',       lat: -1.29,  lng: 36.82,  continent: 3, country: 'KE', population: 350  },
  { id: 72, name: 'Kapstadt',      lat: -33.93, lng: 18.42,  continent: 3, country: 'ZA', population: 300  },
  { id: 73, name: 'Kairo',         lat: 30.06,  lng: 31.25,  continent: 3, country: 'EG', population: 400  },
  { id: 74, name: 'Accra',         lat: 5.56,   lng: -0.20,  continent: 3, country: 'GH', population: 200  },

  // === ASIEN ===
  { id: 80, name: 'Tokyo',         lat: 35.68,  lng: 139.69, continent: 4, country: 'JP', population: 1400 },
  { id: 81, name: 'Osaka',         lat: 34.69,  lng: 135.50, continent: 4, country: 'JP', population: 700  },
  { id: 82, name: 'Seoul',         lat: 37.57,  lng: 126.98, continent: 4, country: 'KR', population: 1000 },
  { id: 83, name: 'Beijing',       lat: 39.91,  lng: 116.39, continent: 4, country: 'CN', population: 1200 },
  { id: 84, name: 'Shanghai',      lat: 31.23,  lng: 121.47, continent: 4, country: 'CN', population: 1100 },
  { id: 85, name: 'Shenzhen',      lat: 22.54,  lng: 114.06, continent: 4, country: 'CN', population: 800  },
  { id: 86, name: 'Singapur',      lat: 1.35,   lng: 103.82, continent: 4, country: 'SG', population: 590  },
  { id: 87, name: 'Mumbai',        lat: 19.07,  lng: 72.88,  continent: 4, country: 'IN', population: 900  },
  { id: 88, name: 'Bangalore',     lat: 12.97,  lng: 77.59,  continent: 4, country: 'IN', population: 700  },
  { id: 89, name: 'Delhi',         lat: 28.61,  lng: 77.21,  continent: 4, country: 'IN', population: 850  },
  { id: 90, name: 'Bangkok',       lat: 13.76,  lng: 100.50, continent: 4, country: 'TH', population: 450  },
  { id: 91, name: 'Jakarta',       lat: -6.21,  lng: 106.85, continent: 4, country: 'ID', population: 380  },
  { id: 92, name: 'Taipei',        lat: 25.05,  lng: 121.56, continent: 4, country: 'TW', population: 370  },
  { id: 93, name: 'Tokio',         lat: 35.68,  lng: 139.69, continent: 4, country: 'JP', population: 1400 },
  { id: 94, name: 'Tel Aviv',      lat: 32.08,  lng: 34.78,  continent: 4, country: 'IL', population: 300  },
  { id: 95, name: 'Dubai',         lat: 25.20,  lng: 55.27,  continent: 4, country: 'AE', population: 350  },

  // === OZEANIEN ===
  { id: 100, name: 'Sydney',       lat: -33.87, lng: 151.21, continent: 5, country: 'AU', population: 500  },
  { id: 101, name: 'Melbourne',    lat: -37.81, lng: 144.96, continent: 5, country: 'AU', population: 430  },
  { id: 102, name: 'Auckland',     lat: -36.85, lng: 174.76, continent: 5, country: 'NZ', population: 160  },
]

// Baum-Struktur aufbauen (Kontinent → Land → Stadt)
function buildTree(): CityNode[] {
  return CITIES.map(city => {
    // Berlin (id=1) ist Root
    if (city.id === 1) return { ...city, parentId: null, depth: 0 }
    // Andere deutsche Städte → Berlin
    if (city.country === 'DE') return { ...city, parentId: 1, depth: 1 }
    // Europäische Städte → Berlin (Europa-Hub)
    if (city.continent === 0) return { ...city, parentId: 1, depth: 2 }
    // Andere Kontinente → London (10) als globaler Knotenpunkt
    return { ...city, parentId: 10, depth: 3 }
  })
}

// Personen-Punkte: kleine Lichter in der Nähe der Städte
function buildPersonNodes(rng: () => number): PersonNode[] {
  const nodes: PersonNode[] = []
  let id = 10000

  for (const city of CITIES.slice(0, 30)) { // nur erste 30 Städte für Performance
    const count = Math.floor(city.population / 200) + 5
    for (let i = 0; i < count; i++) {
      const angle = rng() * 2 * Math.PI
      const r = Math.sqrt(rng()) * 0.8 // max 0.8 Grad (~90km)
      nodes.push({
        id: id++,
        lat: city.lat + r * Math.sin(angle),
        lng: city.lng + r * Math.cos(angle),
        cityId: city.id,
        continent: city.continent,
        isMyNode: city.id === 1 && i < 8, // erste 8 Berlin-Nodes = "meine" Einladungen
      })
    }
  }
  return nodes
}

interface PersonNode {
  id: number
  lat: number
  lng: number
  cityId: number
  continent: number
  isMyNode: boolean
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// Cache
let cachedCities: CityNode[] | null = null
let cachedPersons: PersonNode[] | null = null

export function getCityNodes(): CityNode[] {
  if (!cachedCities) cachedCities = buildTree()
  return cachedCities
}

export function getPersonNodes(): PersonNode[] {
  if (!cachedPersons) cachedPersons = buildPersonNodes(seededRandom(42))
  return cachedPersons
}

// Ältere API — Kompatibilität
export function generateTrustNetwork() { return getCityNodes() }

// ── Render-Hilfsfunktionen ───────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function drawGlowNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  glowIntensity: number // 0-1, wie stark der Glow-Halo ist
) {
  const [r, g, b] = hexToRgb(color)

  // Äußerer Glow-Halo (groß, transparent)
  if (glowIntensity > 0) {
    const glowRadius = radius * (3 + glowIntensity * 6)
    const grd = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowRadius)
    grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * glowIntensity * 0.4})`)
    grd.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * glowIntensity * 0.15})`)
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.beginPath()
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()
  }

  // Innerer heller Kern
  const innerGrd = ctx.createRadialGradient(x, y, 0, x, y, radius)
  innerGrd.addColorStop(0, `rgba(255,255,255,${alpha})`)
  innerGrd.addColorStop(0.3, `rgba(${r},${g},${b},${alpha})`)
  innerGrd.addColorStop(1, `rgba(${r},${g},${b},${alpha * 0.6})`)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = innerGrd
  ctx.fill()
}

function drawGlowLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number,
  alpha: number
) {
  // Äußere Glow-Linie (breit, transparent)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = `rgba(180,200,255,${alpha * 0.15})`
  ctx.lineWidth = width * 4
  ctx.lineCap = 'round'
  ctx.stroke()

  // Innere helle Linie
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = `rgba(220,235,255,${alpha * 0.7})`
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

// ── Haupt-Overlay-Klasse ─────────────────────────────────────

export class TrustNetworkOverlay extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private cities: CityNode[]
  private persons: PersonNode[]
  mode: 'all' | 'my'
  private _map: L.Map | null = null
  private _animFrame: number | null = null
  private _currentZoom = 3

  constructor(_nodes: CityNode[], mode: 'all' | 'my') {
    super()
    this.cities = getCityNodes()
    this.persons = getPersonNodes()
    this.mode = mode
  }

  onAdd(map: L.Map): this {
    this._map = map
    this._currentZoom = map.getZoom()

    const pane = map.getPane('overlayPane')!
    this.canvas = L.DomUtil.create('canvas', 'trust-network-canvas', pane) as HTMLCanvasElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'

    this._resize()
    this._scheduleRedraw()

    map.on('moveend zoomend viewreset', this._onMapChange, this)
    map.on('zoom', this._onZoom, this)
    return this
  }

  onRemove(map: L.Map): this {
    map.off('moveend zoomend viewreset', this._onMapChange, this)
    map.off('zoom', this._onZoom, this)
    if (this._animFrame) cancelAnimationFrame(this._animFrame)
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas)
    this.canvas = null
    this._map = null
    return this
  }

  setMode(mode: 'all' | 'my') {
    this.mode = mode
    this._scheduleRedraw()
  }

  private _onMapChange() {
    this._resize()
    this._scheduleRedraw()
  }

  private _onZoom() {
    if (this._map) this._currentZoom = this._map.getZoom()
    this._resize()
    this._scheduleRedraw()
  }

  private _scheduleRedraw() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame)
    this._animFrame = requestAnimationFrame(() => this._draw())
  }

  private _resize() {
    if (!this._map || !this.canvas) return
    const size = this._map.getSize()
    this.canvas.width = size.x
    this.canvas.height = size.y
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

    const bounds = map.getBounds().pad(0.2)

    // ── Zoom-Stufe bestimmt was gezeichnet wird ──────────────
    //
    // zoom < 3:  nur Kontinente (6 Knoten)
    // zoom 3-5:  Länder-Cluster (Städte nach Ländern zusammengefasst)
    // zoom 5-8:  Städte (alle 100+ Knoten)
    // zoom 8+:   Städte + Personen

    if (zoom <= 2) {
      this._drawContinentLevel(ctx, map, bounds, zoom)
    } else if (zoom <= 5) {
      this._drawCityLevel(ctx, map, bounds, zoom)
    } else if (zoom <= 9) {
      this._drawCityLevel(ctx, map, bounds, zoom)
    } else {
      this._drawCityLevel(ctx, map, bounds, zoom)
      this._drawPersonLevel(ctx, map, bounds, zoom)
    }
  }

  // ── STUFE 1: Kontinente ──────────────────────────────────────
  private _drawContinentLevel(
    ctx: CanvasRenderingContext2D,
    map: L.Map,
    bounds: L.LatLngBounds,
    zoom: number
  ) {
    // Verbindungen zwischen Kontinenten
    for (let i = 0; i < CONTINENTS.length; i++) {
      for (let j = i + 1; j < CONTINENTS.length; j++) {
        const c1 = CONTINENTS[i]
        const c2 = CONTINENTS[j]
        const p1 = map.latLngToContainerPoint([c1.lat, c1.lng])
        const p2 = map.latLngToContainerPoint([c2.lat, c2.lng])
        drawGlowLine(ctx, p1.x, p1.y, p2.x, p2.y, 1.5, 0.5)
      }
    }

    // Kontinent-Knoten
    CONTINENTS.forEach(cont => {
      const p = map.latLngToContainerPoint([cont.lat, cont.lng])
      drawGlowNode(ctx, p.x, p.y, 18, cont.color, 0.95, 1.0)
    })
  }

  // ── STUFE 2+3: Städte ────────────────────────────────────────
  private _drawCityLevel(
    ctx: CanvasRenderingContext2D,
    map: L.Map,
    bounds: L.LatLngBounds,
    zoom: number
  ) {
    const showAll = this.mode === 'all'

    // Welche Städte filtern?
    let visibleCities = this.cities
    if (this.mode === 'my') {
      // Nur Berlin + direkte Verbindungen (depth 0+1)
      visibleCities = this.cities.filter(c => c.depth <= 1 || c.country === 'DE')
    }

    // Bei niedrigem Zoom: nur größere Städte zeigen
    if (zoom <= 4) {
      visibleCities = visibleCities.filter(c => c.population >= 800)
    } else if (zoom <= 6) {
      visibleCities = visibleCities.filter(c => c.population >= 300)
    }

    // Knotengrößen-Skalierung nach Zoom
    const baseNodeSize = zoom <= 3 ? 14 : zoom <= 5 ? 10 : zoom <= 7 ? 7 : 5
    const lineWidth = zoom <= 3 ? 2.5 : zoom <= 5 ? 1.8 : zoom <= 7 ? 1.2 : 0.8
    const lineAlpha = zoom <= 3 ? 0.7 : zoom <= 5 ? 0.55 : zoom <= 7 ? 0.4 : 0.3
    const glowIntensity = zoom <= 3 ? 1.0 : zoom <= 5 ? 0.8 : zoom <= 7 ? 0.5 : 0.3

    const cityMap = new Map(visibleCities.map(c => [c.id, c]))

    // Linien zuerst (unter Knoten)
    for (const city of visibleCities) {
      if (city.parentId === null) continue
      const parent = cityMap.get(city.parentId)
      if (!parent) continue

      const inView = bounds.contains([city.lat, city.lng]) || bounds.contains([parent.lat, parent.lng])
      if (!inView) continue

      const p1 = map.latLngToContainerPoint([parent.lat, parent.lng])
      const p2 = map.latLngToContainerPoint([city.lat, city.lng])

      // "Mein Netz" Modus: eigene Verbindungen gold hervorheben
      const isMyConnection = this.mode === 'my' && city.depth <= 1
      drawGlowLine(
        ctx, p1.x, p1.y, p2.x, p2.y,
        isMyConnection ? lineWidth * 1.8 : lineWidth,
        isMyConnection ? lineAlpha * 1.5 : lineAlpha
      )
    }

    // Knoten darüber
    for (const city of visibleCities) {
      if (!bounds.contains([city.lat, city.lng])) continue
      const p = map.latLngToContainerPoint([city.lat, city.lng])
      const cont = CONTINENTS[city.continent]

      // Knotengröße nach Bevölkerung und Zoom
      const sizeMultiplier = Math.log10(city.population) / Math.log10(9000)
      const nodeSize = baseNodeSize * (0.4 + sizeMultiplier * 0.6)
      const isRoot = city.id === 1

      // Root (Berlin/"Ich") extra hervorheben
      const color = isRoot ? '#f59e0b' : (showAll ? cont.color : '#f59e0b')
      const glow = isRoot ? 1.0 : glowIntensity

      drawGlowNode(ctx, p.x, p.y, isRoot ? nodeSize * 1.5 : nodeSize, color, 0.9, glow)
    }
  }

  // ── STUFE 4: Personen ────────────────────────────────────────
  private _drawPersonLevel(
    ctx: CanvasRenderingContext2D,
    map: L.Map,
    bounds: L.LatLngBounds,
    zoom: number
  ) {
    const persons = this.mode === 'my'
      ? this.persons.filter(p => p.isMyNode || p.cityId === 1)
      : this.persons

    const dotSize = Math.max(1.5, zoom * 0.4 - 2)

    for (const person of persons) {
      if (!bounds.contains([person.lat, person.lng])) continue
      const p = map.latLngToContainerPoint([person.lat, person.lng])
      const cont = CONTINENTS[person.continent]
      const color = person.isMyNode ? '#f59e0b' : cont.color
      drawGlowNode(ctx, p.x, p.y, dotSize, color, 0.7, 0.3)
    }
  }
}
