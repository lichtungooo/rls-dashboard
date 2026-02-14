/**
 * Web of Trust - Myzel-Netzwerk v4
 *
 * Flächenbasierte Verteilung: jedes Land proportional zur Landfläche.
 * Russland/Kanada/Brasilien/Australien vollflächig abgedeckt.
 * Alle Knoten weiß/blau-weiß. Verbindungen: organische weiße Linien.
 *
 * Zoom-Clustering:
 * - Weit raus:  große leuchtende Knoten sichtbar (level 0 + 1)
 * - Mittel:     Regionen erscheinen (level 2)
 * - Nah rein:   individuelle Punkte (level 3)
 */

import L from 'leaflet'

// ── Typen ────────────────────────────────────────────────────

export interface MycelNode {
  id: number
  lat: number
  lng: number
  weight: number      // Sichtbarkeits-Gewicht 0.1–1.0
  level: number       // Zoom-Level ab dem sichtbar: 0=immer, 1=ab zoom 3, 2=ab zoom 6, 3=ab zoom 9
  isRoot: boolean     // "Ich" — Berlin
  isMyNetwork: boolean
  parentId: number | null
}

// ── Flächen-Zonen ────────────────────────────────────────────
// count ist proportional zur Landfläche des Landes/Region
// Russland ~17M km² → 60 Knoten; Vatikan → 0
// Die Zonen decken das GESAMTE Territorium ab

interface AreaZone {
  lat: number
  lng: number
  radiusKm: number
  count: number
  weight: number  // Helligkeit der Punkte (uniform im Land)
  level: number   // 0=immer, 1=ab zoom3, 2=ab zoom6, 3=ab zoom9
}

const AREA_ZONES: AreaZone[] = [

  // ══════════════════════════════════════════════════════════
  // RUSSLAND (17.1M km²) — vollflächig, viele Zonen
  // Von Kaliningrad bis Wladiwostok, von Arktis bis Kaukasus
  // ══════════════════════════════════════════════════════════
  { lat: 55.8,  lng: 37.6,   radiusKm: 300,  count: 8,  weight: 0.85, level: 0 }, // Moskau-Region
  { lat: 59.9,  lng: 30.3,   radiusKm: 200,  count: 5,  weight: 0.75, level: 1 }, // St. Petersburg
  { lat: 56.0,  lng: 50.0,   radiusKm: 350,  count: 6,  weight: 0.65, level: 1 }, // Wolga-Region
  { lat: 57.0,  lng: 60.0,   radiusKm: 350,  count: 6,  weight: 0.60, level: 1 }, // Ural
  { lat: 55.0,  lng: 73.4,   radiusKm: 300,  count: 5,  weight: 0.58, level: 1 }, // West-Sibirien (Omsk/Nowosibirsk)
  { lat: 56.5,  lng: 84.0,   radiusKm: 300,  count: 5,  weight: 0.55, level: 2 }, // Nowosibirsk-Region
  { lat: 56.0,  lng: 93.0,   radiusKm: 350,  count: 5,  weight: 0.52, level: 2 }, // Krasnojarsk
  { lat: 52.3,  lng: 104.3,  radiusKm: 300,  count: 5,  weight: 0.55, level: 2 }, // Irkutsk/Baikalsee
  { lat: 62.0,  lng: 129.7,  radiusKm: 400,  count: 4,  weight: 0.45, level: 2 }, // Jakutien
  { lat: 43.1,  lng: 131.9,  radiusKm: 200,  count: 4,  weight: 0.60, level: 2 }, // Wladiwostok/Fernost
  { lat: 53.0,  lng: 140.0,  radiusKm: 300,  count: 3,  weight: 0.40, level: 2 }, // Chabarowsk
  // Nord-Sibirien (arktisch, sehr dünn)
  { lat: 70.0,  lng: 60.0,   radiusKm: 500,  count: 3,  weight: 0.30, level: 2 }, // Nordrussland West
  { lat: 70.0,  lng: 100.0,  radiusKm: 600,  count: 3,  weight: 0.25, level: 2 }, // Nordrussland Mitte
  { lat: 68.0,  lng: 140.0,  radiusKm: 500,  count: 3,  weight: 0.25, level: 2 }, // Nordrussland Ost
  { lat: 60.0,  lng: 115.0,  radiusKm: 400,  count: 4,  weight: 0.42, level: 2 }, // Sibirien Mitte
  { lat: 50.0,  lng: 80.0,   radiusKm: 300,  count: 4,  weight: 0.48, level: 2 }, // Kasachstan-Grenze/Altai

  // ══════════════════════════════════════════════════════════
  // KANADA (10.0M km²) — vollflächig Ost bis West, inkl. Arktis
  // ══════════════════════════════════════════════════════════
  { lat: 43.7,  lng: -79.4,  radiusKm: 250,  count: 5,  weight: 0.80, level: 0 }, // Toronto/Ontario
  { lat: 45.5,  lng: -73.6,  radiusKm: 200,  count: 4,  weight: 0.75, level: 1 }, // Montreal/Quebec
  { lat: 49.3,  lng: -123.1, radiusKm: 200,  count: 4,  weight: 0.72, level: 1 }, // Vancouver/BC
  { lat: 51.0,  lng: -114.0, radiusKm: 250,  count: 4,  weight: 0.65, level: 1 }, // Calgary/Alberta
  { lat: 50.4,  lng: -104.6, radiusKm: 300,  count: 4,  weight: 0.55, level: 2 }, // Saskatchewan/Prairies
  { lat: 49.9,  lng: -97.1,  radiusKm: 250,  count: 3,  weight: 0.58, level: 2 }, // Manitoba/Winnipeg
  { lat: 46.8,  lng: -71.2,  radiusKm: 200,  count: 3,  weight: 0.60, level: 2 }, // Quebec-Stadt
  { lat: 44.6,  lng: -63.6,  radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Maritimes/Halifax
  // Nordrkanada (dünn, aber vorhanden)
  { lat: 60.7,  lng: -135.1, radiusKm: 400,  count: 3,  weight: 0.35, level: 2 }, // Yukon
  { lat: 62.5,  lng: -114.3, radiusKm: 400,  count: 3,  weight: 0.32, level: 2 }, // Northwest Territories
  { lat: 63.7,  lng: -68.5,  radiusKm: 500,  count: 3,  weight: 0.30, level: 2 }, // Nunavut
  { lat: 74.0,  lng: -95.0,  radiusKm: 600,  count: 2,  weight: 0.22, level: 3 }, // Arktis Kanada

  // ══════════════════════════════════════════════════════════
  // USA (9.8M km²) — Ost- und Westküste dicht, Mitte vorhanden
  // ══════════════════════════════════════════════════════════
  { lat: 40.7,  lng: -74.0,  radiusKm: 200,  count: 7,  weight: 0.92, level: 0 }, // New York Metro
  { lat: 34.1,  lng: -118.2, radiusKm: 200,  count: 6,  weight: 0.88, level: 0 }, // Los Angeles
  { lat: 41.9,  lng: -87.6,  radiusKm: 180,  count: 5,  weight: 0.82, level: 0 }, // Chicago
  { lat: 37.8,  lng: -122.4, radiusKm: 150,  count: 5,  weight: 0.80, level: 1 }, // San Francisco
  { lat: 47.6,  lng: -122.3, radiusKm: 150,  count: 4,  weight: 0.75, level: 1 }, // Seattle
  { lat: 42.4,  lng: -71.1,  radiusKm: 120,  count: 4,  weight: 0.72, level: 1 }, // Boston
  { lat: 38.9,  lng: -77.0,  radiusKm: 150,  count: 4,  weight: 0.78, level: 1 }, // Washington DC
  { lat: 29.8,  lng: -95.4,  radiusKm: 180,  count: 4,  weight: 0.70, level: 1 }, // Texas/Houston
  { lat: 25.8,  lng: -80.2,  radiusKm: 150,  count: 4,  weight: 0.68, level: 1 }, // Florida/Miami
  // Inland/Mitte (dünn aber vorhanden)
  { lat: 39.7,  lng: -104.9, radiusKm: 250,  count: 4,  weight: 0.55, level: 2 }, // Colorado/Denver
  { lat: 36.2,  lng: -115.2, radiusKm: 200,  count: 3,  weight: 0.52, level: 2 }, // Nevada/Las Vegas
  { lat: 44.0,  lng: -103.0, radiusKm: 350,  count: 4,  weight: 0.45, level: 2 }, // Dakotas/Great Plains
  { lat: 37.0,  lng: -97.0,  radiusKm: 300,  count: 4,  weight: 0.48, level: 2 }, // Kansas/Oklahoma
  { lat: 46.9,  lng: -110.0, radiusKm: 300,  count: 3,  weight: 0.42, level: 2 }, // Montana/Wyoming
  { lat: 38.0,  lng: -84.5,  radiusKm: 250,  count: 4,  weight: 0.58, level: 2 }, // Kentucky/Tennessee
  { lat: 32.8,  lng: -83.6,  radiusKm: 250,  count: 4,  weight: 0.55, level: 2 }, // Georgia/Alabama
  { lat: 44.0,  lng: -120.0, radiusKm: 250,  count: 3,  weight: 0.50, level: 2 }, // Oregon
  // Alaska
  { lat: 64.2,  lng: -153.0, radiusKm: 500,  count: 3,  weight: 0.35, level: 2 }, // Alaska

  // ══════════════════════════════════════════════════════════
  // BRASILIEN (8.5M km²) — Amazonas vollflächig
  // ══════════════════════════════════════════════════════════
  { lat: -23.6, lng: -46.6,  radiusKm: 200,  count: 5,  weight: 0.80, level: 0 }, // São Paulo
  { lat: -22.9, lng: -43.2,  radiusKm: 150,  count: 4,  weight: 0.72, level: 1 }, // Rio de Janeiro
  { lat: -15.8, lng: -47.9,  radiusKm: 150,  count: 3,  weight: 0.65, level: 1 }, // Brasília
  { lat: -3.7,  lng: -38.5,  radiusKm: 150,  count: 3,  weight: 0.58, level: 1 }, // Fortaleza/Nordeste
  { lat: -13.0, lng: -38.5,  radiusKm: 150,  count: 3,  weight: 0.58, level: 2 }, // Salvador/Bahia
  { lat: -8.1,  lng: -34.9,  radiusKm: 150,  count: 3,  weight: 0.55, level: 2 }, // Recife/Pernambuco
  { lat: -3.1,  lng: -60.0,  radiusKm: 250,  count: 4,  weight: 0.55, level: 2 }, // Manaus/Zentralamazonas
  // Amazonas-Regenwald (dünn aber riesig)
  { lat: -5.0,  lng: -55.0,  radiusKm: 400,  count: 4,  weight: 0.38, level: 2 }, // Amazonas West
  { lat: -8.0,  lng: -65.0,  radiusKm: 400,  count: 4,  weight: 0.35, level: 2 }, // Amazonas SW
  { lat: -2.0,  lng: -70.0,  radiusKm: 350,  count: 3,  weight: 0.32, level: 2 }, // Amazonas NW
  { lat: -12.0, lng: -48.0,  radiusKm: 350,  count: 4,  weight: 0.42, level: 2 }, // Cerrado/Mato Grosso
  { lat: -20.0, lng: -55.0,  radiusKm: 300,  count: 4,  weight: 0.48, level: 2 }, // Mato Grosso do Sul
  { lat: -30.0, lng: -51.2,  radiusKm: 200,  count: 4,  weight: 0.60, level: 2 }, // Porto Alegre/Südbrasilien

  // ══════════════════════════════════════════════════════════
  // AUSTRALIEN (7.7M km²) — Outback vollflächig
  // ══════════════════════════════════════════════════════════
  { lat: -33.9, lng: 151.2,  radiusKm: 150,  count: 4,  weight: 0.75, level: 0 }, // Sydney
  { lat: -37.8, lng: 145.0,  radiusKm: 150,  count: 4,  weight: 0.70, level: 1 }, // Melbourne
  { lat: -27.5, lng: 153.0,  radiusKm: 120,  count: 3,  weight: 0.62, level: 1 }, // Brisbane
  { lat: -31.9, lng: 115.9,  radiusKm: 150,  count: 3,  weight: 0.60, level: 1 }, // Perth
  { lat: -34.9, lng: 138.6,  radiusKm: 120,  count: 2,  weight: 0.55, level: 2 }, // Adelaide
  { lat: -12.5, lng: 130.8,  radiusKm: 150,  count: 2,  weight: 0.52, level: 2 }, // Darwin/Northern Territory
  // Outback (sehr dünn aber vorhanden)
  { lat: -25.0, lng: 130.0,  radiusKm: 500,  count: 4,  weight: 0.32, level: 2 }, // Outback Zentrum
  { lat: -20.0, lng: 140.0,  radiusKm: 400,  count: 3,  weight: 0.30, level: 2 }, // Queensland Inland
  { lat: -30.0, lng: 125.0,  radiusKm: 450,  count: 3,  weight: 0.28, level: 2 }, // Westaustralia Inland
  { lat: -33.0, lng: 120.0,  radiusKm: 350,  count: 3,  weight: 0.30, level: 2 }, // Nullarbor/Südküste

  // ══════════════════════════════════════════════════════════
  // INDIEN (3.3M km²)
  // ══════════════════════════════════════════════════════════
  { lat: 19.1,  lng: 72.9,   radiusKm: 180,  count: 6,  weight: 0.85, level: 0 }, // Mumbai
  { lat: 28.6,  lng: 77.2,   radiusKm: 180,  count: 6,  weight: 0.85, level: 0 }, // Delhi
  { lat: 12.9,  lng: 77.6,   radiusKm: 150,  count: 5,  weight: 0.80, level: 1 }, // Bangalore
  { lat: 22.6,  lng: 88.4,   radiusKm: 150,  count: 5,  weight: 0.75, level: 1 }, // Kolkata
  { lat: 13.1,  lng: 80.3,   radiusKm: 120,  count: 4,  weight: 0.72, level: 1 }, // Chennai
  { lat: 17.4,  lng: 78.5,   radiusKm: 120,  count: 4,  weight: 0.70, level: 1 }, // Hyderabad
  { lat: 23.0,  lng: 72.6,   radiusKm: 200,  count: 4,  weight: 0.65, level: 2 }, // Gujarat
  { lat: 26.0,  lng: 80.0,   radiusKm: 200,  count: 4,  weight: 0.65, level: 2 }, // Uttar Pradesh
  { lat: 25.6,  lng: 85.1,   radiusKm: 180,  count: 4,  weight: 0.62, level: 2 }, // Bihar/Jharkhand
  { lat: 20.0,  lng: 85.8,   radiusKm: 200,  count: 4,  weight: 0.60, level: 2 }, // Odisha
  { lat: 15.5,  lng: 74.0,   radiusKm: 200,  count: 3,  weight: 0.58, level: 2 }, // Karnataka/Goa
  { lat: 26.0,  lng: 91.7,   radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Assam/NE-Indien
  { lat: 32.0,  lng: 74.0,   radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Punjab/Nordindien
  { lat: 22.0,  lng: 78.0,   radiusKm: 250,  count: 4,  weight: 0.58, level: 2 }, // Madhya Pradesh

  // ══════════════════════════════════════════════════════════
  // CHINA (9.6M km²)
  // ══════════════════════════════════════════════════════════
  { lat: 39.9,  lng: 116.4,  radiusKm: 200,  count: 6,  weight: 0.88, level: 0 }, // Beijing
  { lat: 31.2,  lng: 121.5,  radiusKm: 200,  count: 6,  weight: 0.88, level: 0 }, // Shanghai
  { lat: 22.5,  lng: 114.1,  radiusKm: 180,  count: 5,  weight: 0.85, level: 1 }, // Shenzhen/HK
  { lat: 23.1,  lng: 113.3,  radiusKm: 150,  count: 5,  weight: 0.80, level: 1 }, // Guangzhou
  { lat: 30.6,  lng: 104.1,  radiusKm: 200,  count: 5,  weight: 0.75, level: 1 }, // Chengdu
  { lat: 34.3,  lng: 108.9,  radiusKm: 200,  count: 4,  weight: 0.68, level: 2 }, // Xi'an/Shaanxi
  { lat: 30.6,  lng: 114.3,  radiusKm: 150,  count: 4,  weight: 0.70, level: 2 }, // Wuhan
  { lat: 36.1,  lng: 120.4,  radiusKm: 150,  count: 4,  weight: 0.68, level: 2 }, // Shandong/Qingdao
  { lat: 43.8,  lng: 87.6,   radiusKm: 300,  count: 3,  weight: 0.50, level: 2 }, // Xinjiang/Urumqi
  { lat: 29.7,  lng: 91.1,   radiusKm: 300,  count: 3,  weight: 0.42, level: 2 }, // Tibet/Lhasa
  { lat: 41.8,  lng: 123.4,  radiusKm: 200,  count: 3,  weight: 0.60, level: 2 }, // Shenyang/Nordchina
  { lat: 25.0,  lng: 101.0,  radiusKm: 250,  count: 3,  weight: 0.55, level: 2 }, // Yunnan

  // ══════════════════════════════════════════════════════════
  // WESTEUROPA (dicht, Standardzonen)
  // ══════════════════════════════════════════════════════════
  { lat: 51.5,  lng: 0.1,    radiusKm: 150,  count: 7,  weight: 0.95, level: 0 }, // London + Umland
  { lat: 48.9,  lng: 2.4,    radiusKm: 120,  count: 6,  weight: 0.90, level: 0 }, // Paris
  { lat: 52.5,  lng: 13.4,   radiusKm: 150,  count: 7,  weight: 1.00, level: 0 }, // Berlin (Root)
  { lat: 51.5,  lng: 7.5,    radiusKm: 150,  count: 7,  weight: 0.92, level: 0 }, // Ruhrgebiet
  { lat: 48.2,  lng: 11.6,   radiusKm: 120,  count: 5,  weight: 0.85, level: 1 }, // München
  { lat: 47.4,  lng: 8.5,    radiusKm: 100,  count: 4,  weight: 0.80, level: 1 }, // Zürich
  { lat: 48.2,  lng: 16.4,   radiusKm: 100,  count: 4,  weight: 0.82, level: 1 }, // Wien
  { lat: 52.4,  lng: 4.9,    radiusKm: 100,  count: 4,  weight: 0.85, level: 1 }, // Amsterdam
  { lat: 50.9,  lng: 4.4,    radiusKm: 100,  count: 4,  weight: 0.80, level: 1 }, // Brüssel
  { lat: 40.4,  lng: -3.7,   radiusKm: 150,  count: 5,  weight: 0.82, level: 1 }, // Madrid
  { lat: 41.4,  lng: 2.2,    radiusKm: 120,  count: 4,  weight: 0.78, level: 1 }, // Barcelona
  { lat: 41.9,  lng: 12.5,   radiusKm: 150,  count: 5,  weight: 0.80, level: 1 }, // Rom
  { lat: 45.5,  lng: 9.2,    radiusKm: 100,  count: 4,  weight: 0.78, level: 1 }, // Mailand
  { lat: 53.5,  lng: -2.5,   radiusKm: 120,  count: 4,  weight: 0.78, level: 1 }, // Manchester/Leeds
  { lat: 55.9,  lng: -3.2,   radiusKm: 100,  count: 3,  weight: 0.70, level: 1 }, // Edinburgh
  { lat: 59.3,  lng: 18.1,   radiusKm: 100,  count: 3,  weight: 0.70, level: 1 }, // Stockholm
  { lat: 55.7,  lng: 12.6,   radiusKm: 100,  count: 3,  weight: 0.68, level: 1 }, // Kopenhagen
  { lat: 60.2,  lng: 24.9,   radiusKm: 100,  count: 3,  weight: 0.65, level: 1 }, // Helsinki
  { lat: 59.9,  lng: 10.7,   radiusKm: 100,  count: 3,  weight: 0.65, level: 1 }, // Oslo
  { lat: 52.2,  lng: 21.0,   radiusKm: 120,  count: 4,  weight: 0.72, level: 1 }, // Warschau
  { lat: 50.1,  lng: 14.4,   radiusKm: 100,  count: 3,  weight: 0.70, level: 2 }, // Prag
  { lat: 47.5,  lng: 19.0,   radiusKm: 100,  count: 3,  weight: 0.70, level: 2 }, // Budapest
  { lat: 50.5,  lng: 30.5,   radiusKm: 120,  count: 3,  weight: 0.72, level: 2 }, // Kiew
  { lat: 41.0,  lng: 29.0,   radiusKm: 150,  count: 5,  weight: 0.82, level: 1 }, // Istanbul
  { lat: 38.7,  lng: -9.1,   radiusKm: 100,  count: 3,  weight: 0.60, level: 2 }, // Lissabon
  { lat: 38.0,  lng: 23.7,   radiusKm: 100,  count: 3,  weight: 0.60, level: 2 }, // Athen
  // Skandinavien-Fläche (dünn aber vorhanden)
  { lat: 62.0,  lng: 14.0,   radiusKm: 400,  count: 4,  weight: 0.40, level: 2 }, // Schweden Inland
  { lat: 65.0,  lng: 26.0,   radiusKm: 400,  count: 4,  weight: 0.38, level: 2 }, // Finnland/Lappland
  { lat: 65.0,  lng: 14.0,   radiusKm: 400,  count: 3,  weight: 0.36, level: 2 }, // Norwegen Inland

  // ══════════════════════════════════════════════════════════
  // SÜDAMERIKA Restländer
  // ══════════════════════════════════════════════════════════
  { lat: -34.6, lng: -58.4,  radiusKm: 150,  count: 4,  weight: 0.72, level: 1 }, // Buenos Aires
  { lat: -31.4, lng: -64.2,  radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Argentinien Inland
  { lat: -38.0, lng: -67.0,  radiusKm: 300,  count: 3,  weight: 0.40, level: 2 }, // Patagonien Argentinien
  { lat: 4.7,   lng: -74.1,  radiusKm: 150,  count: 3,  weight: 0.60, level: 1 }, // Bogotá
  { lat: 7.0,   lng: -73.0,  radiusKm: 250,  count: 3,  weight: 0.45, level: 2 }, // Kolumbien Inland
  { lat: -12.0, lng: -77.0,  radiusKm: 150,  count: 3,  weight: 0.58, level: 1 }, // Lima
  { lat: -10.0, lng: -75.0,  radiusKm: 300,  count: 3,  weight: 0.38, level: 2 }, // Peru Inland
  { lat: -33.5, lng: -70.7,  radiusKm: 150,  count: 3,  weight: 0.58, level: 2 }, // Santiago
  { lat: -45.0, lng: -72.0,  radiusKm: 350,  count: 3,  weight: 0.35, level: 2 }, // Patagonien Chile
  { lat: -16.5, lng: -68.1,  radiusKm: 200,  count: 3,  weight: 0.48, level: 2 }, // Bolivien/La Paz
  { lat: -25.3, lng: -57.6,  radiusKm: 200,  count: 3,  weight: 0.50, level: 2 }, // Paraguay
  { lat: -32.5, lng: -55.0,  radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Uruguay
  { lat: 5.9,   lng: -55.2,  radiusKm: 200,  count: 3,  weight: 0.40, level: 2 }, // Guyana/Suriname
  { lat: 4.0,   lng: -63.0,  radiusKm: 250,  count: 3,  weight: 0.40, level: 2 }, // Venezuela Inland

  // ══════════════════════════════════════════════════════════
  // AFRIKA (vollflächig)
  // ══════════════════════════════════════════════════════════
  { lat: 30.1,  lng: 31.2,   radiusKm: 150,  count: 5,  weight: 0.72, level: 0 }, // Kairo
  { lat: 6.5,   lng: 3.4,    radiusKm: 150,  count: 5,  weight: 0.70, level: 0 }, // Lagos
  { lat: -1.3,  lng: 36.8,   radiusKm: 150,  count: 4,  weight: 0.60, level: 1 }, // Nairobi
  { lat: -33.9, lng: 18.4,   radiusKm: 150,  count: 4,  weight: 0.60, level: 1 }, // Kapstadt
  { lat: -26.2, lng: 28.0,   radiusKm: 150,  count: 4,  weight: 0.62, level: 1 }, // Johannesburg
  { lat: 5.6,   lng: -0.2,   radiusKm: 150,  count: 3,  weight: 0.52, level: 2 }, // Accra
  { lat: 14.7,  lng: -17.4,  radiusKm: 150,  count: 3,  weight: 0.48, level: 2 }, // Dakar
  { lat: 12.4,  lng: -1.5,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Ouagadougou/Burkina
  { lat: 12.4,  lng: 13.3,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Nordnigeria/Tschad
  { lat: 3.9,   lng: 11.5,   radiusKm: 200,  count: 3,  weight: 0.48, level: 2 }, // Kamerun
  { lat: -4.3,  lng: 15.3,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Kinshasa/Kongo
  { lat: -8.8,  lng: 25.0,   radiusKm: 300,  count: 3,  weight: 0.42, level: 2 }, // Kongo/Sambia
  { lat: -15.4, lng: 28.3,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Sambia/Simbabwe
  { lat: -25.9, lng: 32.6,   radiusKm: 200,  count: 3,  weight: 0.48, level: 2 }, // Mosambik
  { lat: -19.0, lng: 47.5,   radiusKm: 200,  count: 3,  weight: 0.42, level: 2 }, // Madagaskar
  { lat: 9.0,   lng: 38.7,   radiusKm: 200,  count: 3,  weight: 0.50, level: 2 }, // Äthiopien
  { lat: 15.6,  lng: 32.5,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Sudan/Khartoum
  // Sahara (sehr dünn aber vorhanden)
  { lat: 23.0,  lng: 5.0,    radiusKm: 600,  count: 4,  weight: 0.22, level: 2 }, // Algerien/Sahara West
  { lat: 23.0,  lng: 20.0,   radiusKm: 600,  count: 4,  weight: 0.20, level: 2 }, // Sahara Mitte/Libyen
  { lat: 20.0,  lng: 35.0,   radiusKm: 500,  count: 3,  weight: 0.22, level: 2 }, // Sahara Ost/Sudan

  // ══════════════════════════════════════════════════════════
  // NAHER OSTEN & ZENTRALASIEN
  // ══════════════════════════════════════════════════════════
  { lat: 32.1,  lng: 34.8,   radiusKm: 100,  count: 4,  weight: 0.70, level: 1 }, // Tel Aviv
  { lat: 25.2,  lng: 55.3,   radiusKm: 100,  count: 4,  weight: 0.68, level: 1 }, // Dubai
  { lat: 24.7,  lng: 46.7,   radiusKm: 150,  count: 3,  weight: 0.60, level: 1 }, // Riad
  { lat: 33.3,  lng: 44.4,   radiusKm: 150,  count: 3,  weight: 0.55, level: 2 }, // Bagdad
  { lat: 35.7,  lng: 51.4,   radiusKm: 150,  count: 3,  weight: 0.58, level: 2 }, // Teheran
  { lat: 33.5,  lng: 36.3,   radiusKm: 100,  count: 3,  weight: 0.55, level: 2 }, // Damaskus
  { lat: 23.6,  lng: 58.6,   radiusKm: 200,  count: 3,  weight: 0.45, level: 2 }, // Oman
  { lat: 25.0,  lng: 45.0,   radiusKm: 400,  count: 3,  weight: 0.35, level: 2 }, // Saudi-Arabien Inland
  // Kasachstan/Zentralasien (riesig, dünn)
  { lat: 51.2,  lng: 71.4,   radiusKm: 400,  count: 3,  weight: 0.40, level: 2 }, // Kasachstan Nord
  { lat: 43.0,  lng: 58.0,   radiusKm: 400,  count: 3,  weight: 0.38, level: 2 }, // Kasachstan Süd/Usbekistan
  { lat: 39.0,  lng: 66.0,   radiusKm: 300,  count: 3,  weight: 0.42, level: 2 }, // Usbekistan/Turkmenistan
  { lat: 37.9,  lng: 58.4,   radiusKm: 250,  count: 3,  weight: 0.45, level: 2 }, // Turkmenistan
  { lat: 34.5,  lng: 69.2,   radiusKm: 250,  count: 3,  weight: 0.45, level: 2 }, // Afghanistan/Kabul
  { lat: 33.7,  lng: 73.1,   radiusKm: 150,  count: 3,  weight: 0.55, level: 2 }, // Pakistan/Islamabad
  { lat: 24.9,  lng: 67.0,   radiusKm: 150,  count: 3,  weight: 0.60, level: 2 }, // Karachi

  // ══════════════════════════════════════════════════════════
  // SÜDOSTASIEN / OZEANIEN
  // ══════════════════════════════════════════════════════════
  { lat: 23.8,  lng: 90.4,   radiusKm: 150,  count: 5,  weight: 0.78, level: 1 }, // Dhaka
  { lat: 6.9,   lng: 79.9,   radiusKm: 100,  count: 3,  weight: 0.55, level: 2 }, // Colombo
  { lat: 1.4,   lng: 103.8,  radiusKm: 80,   count: 4,  weight: 0.80, level: 1 }, // Singapur
  { lat: 13.8,  lng: 100.5,  radiusKm: 150,  count: 4,  weight: 0.70, level: 1 }, // Bangkok
  { lat: -6.2,  lng: 106.8,  radiusKm: 150,  count: 4,  weight: 0.68, level: 1 }, // Jakarta
  { lat: -7.3,  lng: 112.7,  radiusKm: 200,  count: 3,  weight: 0.55, level: 2 }, // Java Ost
  { lat: 0.0,   lng: 109.0,  radiusKm: 300,  count: 3,  weight: 0.42, level: 2 }, // Borneo
  { lat: -1.3,  lng: 120.0,  radiusKm: 350,  count: 3,  weight: 0.38, level: 2 }, // Sulawesi
  { lat: 25.1,  lng: 121.6,  radiusKm: 100,  count: 3,  weight: 0.70, level: 2 }, // Taipei
  { lat: 21.0,  lng: 105.8,  radiusKm: 100,  count: 3,  weight: 0.62, level: 2 }, // Hanoi
  { lat: 10.8,  lng: 106.7,  radiusKm: 100,  count: 3,  weight: 0.65, level: 2 }, // Ho Chi Minh
  { lat: 4.2,   lng: 101.7,  radiusKm: 150,  count: 3,  weight: 0.62, level: 2 }, // Kuala Lumpur
  { lat: 11.6,  lng: 104.9,  radiusKm: 150,  count: 3,  weight: 0.55, level: 2 }, // Phnom Penh
  { lat: 14.1,  lng: 108.3,  radiusKm: 200,  count: 3,  weight: 0.50, level: 2 }, // Vietnam Inland
  { lat: 16.5,  lng: 96.0,   radiusKm: 200,  count: 3,  weight: 0.52, level: 2 }, // Myanmar/Yangon
  { lat: 27.7,  lng: 85.3,   radiusKm: 150,  count: 3,  weight: 0.50, level: 2 }, // Nepal
  // Philippinen
  { lat: 14.6,  lng: 121.0,  radiusKm: 150,  count: 3,  weight: 0.65, level: 2 }, // Manila
  { lat: 10.0,  lng: 124.0,  radiusKm: 200,  count: 3,  weight: 0.48, level: 2 }, // Visayas
  // Neuseeland
  { lat: -36.9, lng: 174.8,  radiusKm: 120,  count: 3,  weight: 0.60, level: 2 }, // Auckland
  { lat: -44.0, lng: 170.0,  radiusKm: 200,  count: 2,  weight: 0.45, level: 2 }, // Südinsel

  // ══════════════════════════════════════════════════════════
  // OSTASIEN RESTLÄNDER
  // ══════════════════════════════════════════════════════════
  { lat: 35.7,  lng: 139.7,  radiusKm: 150,  count: 7,  weight: 0.92, level: 0 }, // Tokyo
  { lat: 34.7,  lng: 135.5,  radiusKm: 120,  count: 5,  weight: 0.85, level: 1 }, // Osaka/Kyoto
  { lat: 37.6,  lng: 127.0,  radiusKm: 150,  count: 5,  weight: 0.85, level: 1 }, // Seoul
  { lat: 35.2,  lng: 136.9,  radiusKm: 100,  count: 3,  weight: 0.72, level: 2 }, // Nagoya
  { lat: 33.6,  lng: 130.4,  radiusKm: 100,  count: 3,  weight: 0.68, level: 2 }, // Fukuoka/Kyushu
  { lat: 43.1,  lng: 141.4,  radiusKm: 150,  count: 3,  weight: 0.62, level: 2 }, // Sapporo/Hokkaido
  { lat: 35.1,  lng: 129.1,  radiusKm: 100,  count: 3,  weight: 0.68, level: 2 }, // Busan
  // Mongolei (riesig, sehr dünn)
  { lat: 47.9,  lng: 106.9,  radiusKm: 300,  count: 2,  weight: 0.45, level: 2 }, // Ulaanbaatar
  { lat: 46.0,  lng: 95.0,   radiusKm: 500,  count: 3,  weight: 0.25, level: 2 }, // Mongolei Westen
  { lat: 44.0,  lng: 112.0,  radiusKm: 500,  count: 3,  weight: 0.22, level: 2 }, // Mongolei Osten

  // ══════════════════════════════════════════════════════════
  // MEXIKO / ZENTRALAMERIKA / KARIBIK
  // ══════════════════════════════════════════════════════════
  { lat: 19.4,  lng: -99.1,  radiusKm: 150,  count: 5,  weight: 0.80, level: 1 }, // Mexico City
  { lat: 20.9,  lng: -89.6,  radiusKm: 200,  count: 3,  weight: 0.52, level: 2 }, // Yucatan/Mexiko Ost
  { lat: 29.1,  lng: -110.9, radiusKm: 300,  count: 3,  weight: 0.45, level: 2 }, // Nordmexiko
  { lat: 14.6,  lng: -90.5,  radiusKm: 150,  count: 3,  weight: 0.52, level: 2 }, // Guatemala
  { lat: 9.9,   lng: -84.1,  radiusKm: 200,  count: 3,  weight: 0.50, level: 2 }, // Costa Rica
  { lat: 23.1,  lng: -82.4,  radiusKm: 100,  count: 3,  weight: 0.58, level: 2 }, // Kuba

  // ══════════════════════════════════════════════════════════
  // GRÖNLAND (2.2M km²) / ISLAND / ARKTIS
  // ══════════════════════════════════════════════════════════
  { lat: 64.2,  lng: -51.7,  radiusKm: 200,  count: 2,  weight: 0.40, level: 2 }, // Grönland Süd/Nuuk
  { lat: 72.0,  lng: -40.0,  radiusKm: 500,  count: 2,  weight: 0.22, level: 2 }, // Grönland Nord
  { lat: 64.1,  lng: -21.9,  radiusKm: 150,  count: 2,  weight: 0.52, level: 2 }, // Reykjavik/Island

]

// ── Seeded Random ────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ── Netzwerk generieren ──────────────────────────────────────

let cachedNodes: MycelNode[] | null = null

export function generateTrustNetwork(): MycelNode[] {
  if (cachedNodes) return cachedNodes

  const rng = seededRandom(1337)
  const nodes: MycelNode[] = []
  let id = 0

  for (const zone of AREA_ZONES) {
    const kmPerDegLat = 111
    const kmPerDegLng = 111 * Math.cos((zone.lat * Math.PI) / 180)

    for (let i = 0; i < zone.count; i++) {
      // Gleichmäßige Flächenverteilung
      const angle = rng() * 2 * Math.PI
      const r = Math.sqrt(rng()) * zone.radiusKm * (0.5 + rng() * 0.5)

      const lat = zone.lat + (r * Math.sin(angle)) / kmPerDegLat
      const lng = zone.lng + (r * Math.cos(angle)) / kmPerDegLng

      // "Mein Netzwerk": Punkte in Deutschland/Berlin-Nähe
      const isMyNetwork = Math.abs(lat - 52.5) < 4 && Math.abs(lng - 13.4) < 5

      nodes.push({
        id: id++,
        lat: Math.max(-85, Math.min(85, lat)),
        lng: ((lng + 180) % 360) - 180,
        weight: zone.weight * (0.75 + rng() * 0.25),
        level: zone.level,
        isRoot: false,
        isMyNetwork,
        parentId: null,
      })
    }
  }

  // Root = "Ich" = Berlin Mitte
  nodes[0] = {
    id: 0, lat: 52.52, lng: 13.405,
    weight: 1.0, level: 0,
    isRoot: true, isMyNetwork: true, parentId: null,
  }

  cachedNodes = nodes
  return nodes
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Ältere API ───────────────────────────────────────────────
export interface CityNode extends MycelNode {}
export function getCityNodes() { return generateTrustNetwork() }
export function getPersonNodes() { return [] }

// ── Render-Hilfsfunktionen ───────────────────────────────────

function drawGlowNode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  alpha: number,
  glowMult: number
) {
  // Großer Außen-Glow (blau-weiß, Biolumineszenz)
  const glowR = radius * (3.0 + glowMult * 6)
  const grd = ctx.createRadialGradient(x, y, radius * 0.2, x, y, glowR)
  grd.addColorStop(0, `rgba(210,228,255,${alpha * glowMult * 0.45})`)
  grd.addColorStop(0.4, `rgba(190,215,255,${alpha * glowMult * 0.18})`)
  grd.addColorStop(1, `rgba(160,195,255,0)`)
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  // Heller Kern (reinweiß)
  const core = ctx.createRadialGradient(x, y, 0, x, y, radius)
  core.addColorStop(0, `rgba(255,255,255,${alpha})`)
  core.addColorStop(0.5, `rgba(230,242,255,${alpha * 0.92})`)
  core.addColorStop(1, `rgba(190,215,255,${alpha * 0.5})`)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = core
  ctx.fill()
}

function drawOrganicLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number, alpha: number,
  rng: () => number
) {
  // Organische Kurve: Bézierkurve
  const mx = (x1 + x2) / 2 + (rng() - 0.5) * Math.abs(x2 - x1) * 0.3
  const my = (y1 + y2) / 2 + (rng() - 0.5) * Math.abs(y2 - y1) * 0.3

  // Äußerer Glow
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(mx, my, x2, y2)
  ctx.strokeStyle = `rgba(195,218,255,${alpha * 0.18})`
  ctx.lineWidth = width * 4
  ctx.lineCap = 'round'
  ctx.stroke()

  // Innere helle Linie (deutlicher als vorher)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(mx, my, x2, y2)
  ctx.strokeStyle = `rgba(240,248,255,${alpha * 0.80})`
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

// ── Haupt-Overlay ────────────────────────────────────────────

export class TrustNetworkOverlay extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private nodes: MycelNode[]
  mode: 'all' | 'my'
  private _map: L.Map | null = null
  private _animFrame: number | null = null
  private _lineRng: () => number

  constructor(_anyNodes: unknown, mode: 'all' | 'my') {
    super()
    this.nodes = generateTrustNetwork()
    this.mode = mode
    this._lineRng = seededRandom(99)
  }

  onAdd(map: L.Map): this {
    this._map = map
    const pane = map.getPane('overlayPane')!
    this.canvas = L.DomUtil.create('canvas', 'myzel-canvas', pane) as HTMLCanvasElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'
    this._resize()
    this._scheduleRedraw()
    map.on('moveend zoomend viewreset zoom', this._onMapChange, this)
    return this
  }

  onRemove(map: L.Map): this {
    map.off('moveend zoomend viewreset zoom', this._onMapChange, this)
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

  private _scheduleRedraw() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame)
    this._animFrame = requestAnimationFrame(() => this._draw())
  }

  private _resize() {
    if (!this._map || !this.canvas) return
    const size = this._map.getSize()
    this.canvas.width = size.x
    this.canvas.height = size.y
    L.DomUtil.setPosition(this.canvas, this._map.containerPointToLayerPoint([0, 0]))
  }

  private _draw() {
    if (!this._map || !this.canvas) return
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const map = this._map
    const zoom = map.getZoom()
    const size = map.getSize()
    ctx.clearRect(0, 0, size.x, size.y)

    const bounds = map.getBounds().pad(0.3)

    // ── Welche Level sichtbar ─────────────────────────────
    // level 0: immer (Hauptzentren)
    // level 1: ab zoom 2
    // level 2: ab zoom 4
    // level 3: ab zoom 7
    const maxLevel = zoom < 2 ? 0 : zoom < 4 ? 1 : zoom < 7 ? 2 : 3

    let visibleNodes = this.nodes.filter(n => n.level <= maxLevel)

    if (this.mode === 'my') {
      visibleNodes = visibleNodes.filter(n => n.isMyNetwork || n.isRoot)
    }

    // ── Zoom-Parameter ─────────────────────────────────────
    // t=1.0 bei zoom=2 (weit raus): große, helle Punkte
    // t=0.0 bei zoom=10 (nah rein): kleine, dezente Punkte
    const t = Math.max(0, Math.min(1, (10 - zoom) / 8))

    // Deutlicher sichtbar als vorher
    const nodeBaseSize = 4 + t * 18         // 4–22px
    const lineWidth    = 0.8 + t * 3.2      // 0.8–4px
    const lineAlpha    = 0.40 + t * 0.55    // 0.4–0.95 (deutlicher!)
    const glowMult     = 0.45 + t * 0.55    // 0.45–1.0

    // RNG zurücksetzen für reproduzierbare Kurven
    this._lineRng = seededRandom(99)

    // ── Verbindungslinien ─────────────────────────────────
    const visibleInView = visibleNodes.filter(n => bounds.contains([n.lat, n.lng]))

    // Maximale Verbindungsdistanz je nach Zoom
    const maxDistKm = zoom < 2 ? 10000 : zoom < 4 ? 4000 : zoom < 7 ? 1200 : 300

    const drawnEdges = new Set<string>()

    for (const node of visibleInView) {
      const candidates = visibleNodes
        .filter(n => n.id !== node.id)
        .map(n => ({ n, d: haversine(node.lat, node.lng, n.lat, n.lng) }))
        .filter(x => x.d < maxDistKm)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)

      for (const { n: neighbor } of candidates) {
        const edgeKey = [Math.min(node.id, neighbor.id), Math.max(node.id, neighbor.id)].join('-')
        if (drawnEdges.has(edgeKey)) continue
        drawnEdges.add(edgeKey)

        const neighborInView = bounds.contains([neighbor.lat, neighbor.lng])
        if (!neighborInView && !bounds.contains([node.lat, node.lng])) continue

        const p1 = map.latLngToContainerPoint([node.lat, node.lng])
        const p2 = map.latLngToContainerPoint([neighbor.lat, neighbor.lng])

        const isMy = this.mode === 'my' && node.isMyNetwork && neighbor.isMyNetwork
        drawOrganicLine(ctx, p1.x, p1.y, p2.x, p2.y,
          isMy ? lineWidth * 2.0 : lineWidth,
          isMy ? Math.min(1, lineAlpha * 1.6) : lineAlpha,
          this._lineRng
        )
      }
    }

    // ── Knoten ─────────────────────────────────────────────
    for (const node of visibleNodes) {
      if (!bounds.contains([node.lat, node.lng])) continue

      const p = map.latLngToContainerPoint([node.lat, node.lng])
      const sizeNode = nodeBaseSize * (0.45 + node.weight * 0.55)
      const alpha = 0.75 + node.weight * 0.25

      if (node.isRoot) {
        // "Ich" — Gold, extra hell
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sizeNode * 4)
        g.addColorStop(0, `rgba(255,220,100,0.6)`)
        g.addColorStop(1, `rgba(255,180,50,0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, sizeNode * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()

        drawGlowNode(ctx, p.x, p.y, sizeNode * 1.5, 1.0, 1.0)
        ctx.beginPath()
        ctx.arc(p.x, p.y, sizeNode * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,200,80,1)'
        ctx.fill()
      } else {
        drawGlowNode(ctx, p.x, p.y, sizeNode, alpha, glowMult * (0.5 + node.weight * 0.5))
      }
    }
  }
}
