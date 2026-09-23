import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Search, Loader2, Locate, AlertCircle, CheckCircle2, Globe } from 'lucide-react';

// Modern Leaflet pin icon
const pinIcon = L.divIcon({
  html: `
    <div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
      <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
    </div>
  `,
  className: 'custom-picker-pin',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

// Map event listener for single clicks
function MapEventsHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Controller to smoothly pan map on coordinate update
function MapRecenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], zoom || map.getZoom() || 14, { animate: true });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapLocationPicker({
  latitude,
  longitude,
  addressHint = '',
  onChange,
  onAddressResolved,
  className = 'h-80 w-full rounded-2xl'
}) {
  // Determine initial coordinates based on passed property data or fallback
  const initialLat = parseFloat(latitude);
  const initialLng = parseFloat(longitude);
  const hasInitialCoords = !isNaN(initialLat) && !isNaN(initialLng);

  const [position, setPosition] = useState({
    lat: hasInitialCoords ? initialLat : 9.03, // Addis Ababa / East Africa neutral initial or user data
    lng: hasInitialCoords ? initialLng : 38.74
  });

  const [mapZoom, setMapZoom] = useState(hasInitialCoords ? 14 : 4);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [addressPreview, setAddressPreview] = useState('');
  const [manualCoords, setManualCoords] = useState({
    lat: hasInitialCoords ? String(initialLat) : '',
    lng: hasInitialCoords ? String(initialLng) : ''
  });

  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastGeocodedAddressRef = useRef('');

  // Sync external coordinates changes
  useEffect(() => {
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      setPosition({ lat: latNum, lng: lngNum });
      setManualCoords({ lat: latNum.toFixed(6), lng: lngNum.toFixed(6) });
      setMapZoom(14);
    }
  }, [latitude, longitude]);

  // Reverse Geocode helper (Pin -> Address Data)
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      setErrorMessage(null);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) throw new Error('Location lookup service unavailable');
      const data = await res.json();

      if (data && data.address) {
        setAddressPreview(data.display_name || '');
        if (onAddressResolved) {
          const addr = data.address;
          const streetParts = [addr.house_number, addr.road].filter(Boolean);
          onAddressResolved({
            streetAddress: streetParts.join(' ') || addr.road || '',
            city: addr.city || addr.town || addr.village || addr.municipality || '',
            subcityDistrict: addr.suburb || addr.neighbourhood || addr.city_district || '',
            stateRegion: addr.state || addr.region || addr.province || '',
            country: addr.country || '',
            postalCode: addr.postcode || '',
            displayName: data.display_name
          });
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding notice:', err.message);
    }
  }, [onAddressResolved]);

  // Forward Geocode helper (Address Text -> Map Coordinates)
  const locateAddress = useCallback(async (queryText) => {
    if (!queryText || queryText.trim().length < 2) return;
    try {
      setIsGeocodingAddress(true);
      setErrorMessage(null);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText.trim())}&addressdetails=1&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) throw new Error('Search failed');
      const items = await res.json();
      if (items && items.length > 0) {
        const item = items[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setPosition({ lat, lng });
        setManualCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
        setMapZoom(14);
        setAddressPreview(item.display_name);
        onChange(lat, lng);
      } else {
        setErrorMessage(`Could not find exact map position for "${queryText}". You can search or click on the map to place the marker.`);
      }
    } catch (err) {
      console.warn('Geocoding notice:', err.message);
    } finally {
      setIsGeocodingAddress(false);
    }
  }, [onChange]);

  // Auto-geocode when addressHint changes (e.g. user enters "Gondar, Ethiopia")
  useEffect(() => {
    if (addressHint && addressHint.trim().length > 3) {
      const cleanHint = addressHint.trim().replace(/^,\s*|,\s*$/g, '');
      if (cleanHint !== lastGeocodedAddressRef.current && (!latitude || !longitude)) {
        lastGeocodedAddressRef.current = cleanHint;
        locateAddress(cleanHint);
      }
    }
  }, [addressHint, latitude, longitude, locateAddress]);

  // Coordinate change emitter with bounds validation
  const updateCoordinates = (lat, lng, doReverseGeocode = true) => {
    const validLat = Math.max(-90, Math.min(90, parseFloat(lat)));
    const validLng = Math.max(-180, Math.min(180, parseFloat(lng)));

    if (isNaN(validLat) || isNaN(validLng)) {
      setErrorMessage('Invalid coordinates. Latitude must be -90 to 90°, Longitude -180 to 180°.');
      return;
    }

    setErrorMessage(null);
    setPosition({ lat: validLat, lng: validLng });
    setManualCoords({ lat: validLat.toFixed(6), lng: validLng.toFixed(6) });
    setMapZoom(14);
    onChange(validLat, validLng);

    if (doReverseGeocode) {
      reverseGeocode(validLat, validLng);
    }
  };

  // Draggable marker handlers
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          updateCoordinates(newPos.lat, newPos.lng, true);
        }
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, onAddressResolved]
  );

  const handleMapClick = (lat, lng) => {
    updateCoordinates(lat, lng, true);
  };

  // Address Geocoding Search
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim() || text.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setErrorMessage(null);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (!res.ok) throw new Error('Search provider error');
        const items = await res.json();
        setSearchResults(items || []);
      } catch (err) {
        console.warn('Nominatim search warning:', err.message);
        setErrorMessage('Location search service temporarily busy. You can click on the map to set coordinates.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setAddressPreview(result.display_name);
    updateCoordinates(lat, lng, false);

    if (onAddressResolved && result.address) {
      const addr = result.address;
      const streetParts = [addr.house_number, addr.road].filter(Boolean);
      onAddressResolved({
        streetAddress: streetParts.join(' ') || addr.road || '',
        city: addr.city || addr.town || addr.village || '',
        subcityDistrict: addr.suburb || addr.neighbourhood || '',
        stateRegion: addr.state || addr.region || '',
        country: addr.country || '',
        postalCode: addr.postcode || '',
        displayName: result.display_name
      });
    }
  };

  // Browser Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        updateCoordinates(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage(`Could not access device location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Search Bar & Action Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search any place in the world (e.g. Gondar, Addis Ababa, London, Dubai)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />

            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id || item.osm_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-900 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sync from Property Address Button */}
          {addressHint && addressHint.trim().length > 2 && (
            <button
              type="button"
              onClick={() => locateAddress(addressHint)}
              disabled={isGeocodingAddress}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              title="Pin map to the property address data you entered"
            >
              {isGeocodingAddress ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>Locate from Address</span>
            </button>
          )}

          {/* Use My Location GPS Button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
            title="Use current device GPS location"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Locate className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>My GPS</span>
          </button>
        </div>
      </div>

      {/* Notice / Warning Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Map Canvas */}
      <div className={`overflow-hidden border border-slate-200 rounded-2xl relative shadow-inner ${className}`}>
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={mapZoom}
          scrollWheelZoom={false}
          className="w-full h-full z-10"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter lat={position.lat} lng={position.lng} zoom={mapZoom} />
          <MapEventsHandler onLocationSelect={handleMapClick} />

          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[position.lat, position.lng]}
            ref={markerRef}
            icon={pinIcon}
          />
        </MapContainer>

        {/* Floating Instruction Banner */}
        <div className="absolute bottom-2 left-2 z-20 bg-slate-900/80 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-lg shadow pointer-events-none flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          Click anywhere or drag pin to position PostGIS point
        </div>
      </div>

      {/* Resolved Address feedback banner */}
      {addressPreview && (
        <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Selected Location: </span>
            <span className="text-slate-700">{addressPreview}</span>
          </div>
        </div>
      )}

      {/* Manual Coordinates Control & PostGIS Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Lat:</span>
            <input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              placeholder="Latitude"
              value={manualCoords.lat}
              onChange={(e) => {
                setManualCoords({ ...manualCoords, lat: e.target.value });
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= -90 && val <= 90) {
                  updateCoordinates(val, position.lng, false);
                }
              }}
              className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-mono text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Lng:</span>
            <input
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              placeholder="Longitude"
              value={manualCoords.lng}
              onChange={(e) => {
                setManualCoords({ ...manualCoords, lng: e.target.value });
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= -180 && val <= 180) {
                  updateCoordinates(position.lat, val, false);
                }
              }}
              className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-mono text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostGIS GEOGRAPHY(POINT, 4326)</span>
        </div>
      </div>
    </div>
  );
}
