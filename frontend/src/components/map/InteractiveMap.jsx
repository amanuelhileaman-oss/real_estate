import React, { useEffect, useMemo, useState, Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { Bed, Bath, Maximize2, MapPin, AlertCircle, Compass, Navigation, ArrowUp, ExternalLink } from 'lucide-react';

// Error Boundary for Map component to isolate Leaflet errors
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Map Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
          <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">Interactive Map Unavailable</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There was an issue loading the map provider or coordinates. Property listings remain fully accessible.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component to dynamically pan/zoom when properties or center change
function MapViewUpdater({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (bounds && bounds.length > 0) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
      } else if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        map.setView(center, zoom || 12);
      }
    } catch (e) {
      console.warn('MapViewUpdater error:', e);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function InteractiveMap({
  properties = [],
  center = [30.2672, -97.7431], // Austin default
  zoom = 12,
  radiusMeters = null,
  activePropertyId = null,
  onMarkerClick,
  className = 'h-[500px] w-full rounded-2xl'
}) {
  const navigate = useNavigate();

  // Validate and sanitize center
  const safeCenter = useMemo(() => {
    if (Array.isArray(center) && center.length === 2) {
      const lat = parseFloat(center[0]);
      const lng = parseFloat(center[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }
    return [30.2672, -97.7431];
  }, [center]);

  // Filter valid coordinate pairs
  const validProperties = useMemo(() => {
    return properties.filter((p) => {
      if (!p || p.latitude === null || p.latitude === undefined || p.longitude === null || p.longitude === undefined) {
        return false;
      }
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [properties]);

  // Compute bounds if valid properties exist
  const bounds = useMemo(() => {
    if (validProperties.length === 0) return null;
    return validProperties.map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)]);
  }, [validProperties]);

  // Create custom modern price pin icon
  const createPinIcon = (property, isActive) => {
    const priceFormatted = formatCurrency(property.price, property.currency);
    const html = `
      <div class="custom-map-pin ${isActive ? 'active-pin' : ''}">
        <span>${priceFormatted}</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-div-icon',
      iconSize: [80, 32],
      iconAnchor: [40, 16]
    });
  };

  return (
    <MapErrorBoundary>
      <div className={`overflow-hidden border border-slate-200 shadow-inner relative bg-slate-50 ${className}`}>
        {validProperties.length === 0 && (!properties || properties.length > 0) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-xs p-6 text-center pointer-events-none">
            <div className="bg-white/95 px-4 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>No geographic coordinates to plot on map</span>
            </div>
          </div>
        )}

        <MapContainer
          center={safeCenter}
          zoom={zoom}
          scrollWheelZoom={false}
          className="w-full h-full z-10"
        >
          {/* Standard OpenStreetMap tiles without watermark */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewUpdater center={safeCenter} zoom={zoom} bounds={bounds} />

          {/* Radius Circle visualizer if PostGIS radius filter is active */}
          {radiusMeters && safeCenter && (
            <Circle
              center={safeCenter}
              radius={radiusMeters}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '6, 6'
              }}
            />
          )}

          {/* Property Markers */}
          {validProperties.map((p) => {
            const lat = parseFloat(p.latitude);
            const lng = parseFloat(p.longitude);
            const isActive = activePropertyId === p.id;
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const isCurrentPage = currentPath.endsWith(p.slug) || currentPath.endsWith(p.id);

            const imageSrc =
              p.primary_image_url ||
              p.media?.[0]?.url ||
              'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80';

            return (
              <Marker
                key={p.id}
                position={[lat, lng]}
                icon={createPinIcon(p, isActive)}
                eventHandlers={{
                  click: () => onMarkerClick && onMarkerClick(p)
                }}
              >
                <Popup className="custom-popup" maxWidth={280}>
                  <div className="rounded-xl overflow-hidden text-left font-sans">
                    <img
                      src={imageSrc}
                      alt={p.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-3">
                      <div className="text-base font-extrabold text-slate-900 mb-0.5">
                        {formatCurrency(p.price, p.currency)}
                        {p.price_period && (
                          <span className="text-xs font-normal text-slate-500">
                            /{p.price_period.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-800 line-clamp-1 mb-1">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2 truncate">
                        {p.street_address ? `${p.street_address}, ` : ''}{p.city}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.bedrooms || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.bathrooms || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-slate-400" />
                          <span>{Math.round(p.area_sqm || 0)} m²</span>
                        </div>
                      </div>

                      {/* Action Button: Directions & Top scroll if already on details page, or navigate to details if on catalog */}
                      {isCurrentPage ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Get Directions</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                            title="Scroll to overview"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <a
                          href={`/properties/${p.slug || p.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/properties/${p.slug || p.id}`);
                          }}
                          className="mt-2.5 block text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs py-2 rounded-xl transition-colors shadow-xs cursor-pointer"
                        >
                          View Property Details
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  );
}
