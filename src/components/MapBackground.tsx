/**
 * Leaflet-Karte als echter Hintergrund
 * Interaktiv, scrollbar, zoom

bar
 */

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix für Leaflet Icons (Webpack-Issue)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export function MapBackground() {
  // Berlin als Zentrum
  const center: [number, number] = [52.52, 13.405]

  return (
    <div id="map-background">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Demo-Marker */}
        <Marker position={center}>
          <Popup>
            <strong>Real Life Stack</strong>
            <br />
            Deine Community-Zentrale
          </Popup>
        </Marker>

        <Marker position={[52.51, 13.38]}>
          <Popup>
            <strong>Gemeinschaftsgarten</strong>
            <br />
            Treffpunkt für Urban Gardening
          </Popup>
        </Marker>

        <Marker position={[52.53, 13.42]}>
          <Popup>
            <strong>Repair Café</strong>
            <br />
            Jeden Samstag 14-18 Uhr
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
