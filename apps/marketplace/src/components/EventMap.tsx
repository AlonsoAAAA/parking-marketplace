'use client';
import { useState, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ParkingOption {
  id: string; name: string; lat: number; lng: number;
  distanceMeters: number; walkMinutes: number;
  available: number; pricing: Record<string, number>;
}

interface Props {
  venueLat: number; venueLng: number;
  parkings: ParkingOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}

// Carto Positron — mapa minimalista, sin token
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function EventMap({ venueLat, venueLng, parkings, selected, onSelect }: Props) {
  const [popup, setPopup] = useState<string | null>(null);

  const handleMarkerClick = useCallback((id: string) => {
    setPopup(prev => prev === id ? null : id);
    onSelect(id);
  }, [onSelect]);

  return (
    <Map
      initialViewState={{ latitude: venueLat, longitude: venueLng, zoom: 14.5 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* Pin del venue */}
      <Marker latitude={venueLat} longitude={venueLng} anchor="bottom">
        <div style={{
          background: '#1a1a1a', color: '#fff', borderRadius: 10,
          padding: '6px 10px', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.35)',
          transform: 'translateY(-4px)',
        }}>
          🎯 Venue
          <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)',
            width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
            borderTop:'6px solid #1a1a1a' }} />
        </div>
      </Marker>

      {/* Pins de estacionamientos */}
      {parkings.map(pk => {
        const isSel = selected === pk.id;
        const minPrice = Math.min(...Object.values(pk.pricing).filter(Boolean));
        return (
          <Marker key={pk.id} latitude={pk.lat} longitude={pk.lng} anchor="bottom"
            onClick={e => { e.originalEvent.stopPropagation(); handleMarkerClick(pk.id); }}>
            <div style={{
              background: isSel ? '#1a1a1a' : '#fff',
              color: isSel ? '#fff' : '#1a1a1a',
              border: `2px solid ${isSel ? '#1a1a1a' : '#ddd'}`,
              borderRadius: 20, padding: '5px 10px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: isSel ? '0 4px 16px rgba(0,0,0,.3)' : '0 2px 8px rgba(0,0,0,.12)',
              transform: isSel ? 'scale(1.08)' : 'scale(1)',
              transition: 'all .15s', whiteSpace: 'nowrap',
            }}>
              🅿 ${minPrice}
              <div style={{
                position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)',
                width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent',
                borderTop: `6px solid ${isSel ? '#1a1a1a' : '#ddd'}`,
              }} />
            </div>
          </Marker>
        );
      })}

      {/* Popup al hacer clic */}
      {popup && (() => {
        const pk = parkings.find(p => p.id === popup);
        if (!pk) return null;
        return (
          <Popup latitude={pk.lat} longitude={pk.lng} anchor="top"
            offset={[0, 10] as [number, number]}
            onClose={() => setPopup(null)}
            closeButton={true} closeOnClick={false}
            style={{ fontFamily:'Inter,sans-serif' }}>
            <div style={{ minWidth:180, padding:'4px 2px' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1a1a1a', marginBottom:4 }}>{pk.name}</div>
              <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>
                🚶 {pk.walkMinutes} min · {pk.distanceMeters} m · {pk.available} lugares
              </div>
              {Object.entries(pk.pricing).map(([type, price]) => (
                <div key={type} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                  <span style={{ color:'#666' }}>{type}</span>
                  <span style={{ fontWeight:600 }}>${price} MXN</span>
                </div>
              ))}
            </div>
          </Popup>
        );
      })()}
    </Map>
  );
}
