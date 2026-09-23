import React, { useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw, Compass, Grid, List, Map, Check, Sparkles, Locate, MapPin } from 'lucide-react';
import { PROPERTY_TYPES, AMENITY_OPTIONS } from '../../utils/constants';

export default function PropertyFilterBar({
  filters,
  onChange,
  onReset,
  viewMode = 'grid',
  onViewModeChange
}) {
  const [expanded, setExpanded] = useState(false);

  const handleInputChange = (field, value) => {
    onChange({ ...filters, [field]: value, page: 1 });
  };

  const selectedAmenities = filters.amenities
    ? filters.amenities.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const handleAmenityToggle = (code) => {
    const lowerCode = code.toLowerCase();
    const exists = selectedAmenities.includes(lowerCode);
    const updated = exists
      ? selectedAmenities.filter((c) => c !== lowerCode)
      : [...selectedAmenities, lowerCode];
    handleInputChange('amenities', updated.join(','));
  };

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.type ||
    filters.listingType ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minBeds ||
    filters.minBaths ||
    filters.minArea ||
    filters.maxArea ||
    filters.furnishedStatus ||
    filters.amenities ||
    filters.city ||
    filters.location ||
    filters.radius
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-8">
      {/* Primary Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.query || ''}
            onChange={(e) => handleInputChange('query', e.target.value)}
            placeholder="Search by title, location, neighborhood, address, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        {/* Listing Type tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => handleInputChange('listingType', '')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !filters.listingType ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('listingType', 'FOR_SALE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filters.listingType === 'FOR_SALE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('listingType', 'FOR_RENT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filters.listingType === 'FOR_RENT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rent
          </button>
        </div>

        {/* Property Type select */}
        <div className="w-full md:w-44 shrink-0">
          <select
            value={filters.type || ''}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Property Types</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Drawer Toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            expanded || hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block ml-0.5" />
          )}
        </button>

        {/* View Mode Switcher (Grid vs List vs Split Map) */}
        {onViewModeChange && (
          <div className="hidden lg:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Split Map View"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Advanced Filters Drawer */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Price Range ($)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleInputChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Area Range (sqm) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Living Area (m²)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min m²"
                  value={filters.minArea || ''}
                  onChange={(e) => handleInputChange('minArea', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max m²"
                  value={filters.maxArea || ''}
                  onChange={(e) => handleInputChange('maxArea', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Bedrooms
              </label>
              <div className="flex items-center gap-1">
                {['', '1', '2', '3', '4+'].map((beds) => (
                  <button
                    key={beds}
                    type="button"
                    onClick={() => handleInputChange('minBeds', beds === '4+' ? '4' : beds)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      (beds === '' && !filters.minBeds) || (beds !== '' && filters.minBeds === (beds === '4+' ? '4' : beds))
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {beds || 'Any'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Bathrooms
              </label>
              <div className="flex items-center gap-1">
                {['', '1', '2', '3+'].map((baths) => (
                  <button
                    key={baths}
                    type="button"
                    onClick={() => handleInputChange('minBaths', baths === '3+' ? '3' : baths)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      (baths === '' && !filters.minBaths) || (baths !== '' && filters.minBaths === (baths === '3+' ? '3' : baths))
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {baths || 'Any'}
                  </button>
                ))}
              </div>
            </div>

            {/* Furnished Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Furnished Status
              </label>
              <select
                value={filters.furnishedStatus || ''}
                onChange={(e) => handleInputChange('furnishedStatus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="">All Furnished Statuses</option>
                <option value="FURNISHED">Fully Furnished</option>
                <option value="SEMI_FURNISHED">Semi-Furnished</option>
                <option value="UNFURNISHED">Unfurnished</option>
              </select>
            </div>

            {/* City / Location */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                City / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Austin, Houston, Dallas..."
                value={filters.city || filters.location || ''}
                onChange={(e) => {
                  handleInputChange('city', e.target.value);
                  handleInputChange('location', e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {/* PostGIS Spatial Radius & Origin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  Radius (PostGIS)
                </label>
                {filters.radius && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...filters, lat: '', lng: '', radius: '', sortBy: filters.sortBy === 'distance' ? 'newest' : filters.sortBy, page: 1 });
                    }}
                    className="text-[10px] text-rose-600 font-semibold hover:underline"
                  >
                    Clear Radius
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={filters.radius || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      onChange({
                        ...filters,
                        lat: filters.lat || '30.2672',
                        lng: filters.lng || '-97.7431',
                        radius: val,
                        page: 1
                      });
                    } else {
                      onChange({
                        ...filters,
                        lat: '',
                        lng: '',
                        radius: '',
                        sortBy: filters.sortBy === 'distance' ? 'newest' : filters.sortBy,
                        page: 1
                      });
                    }
                  }}
                  className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <option value="">Any Distance</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                </select>

                {/* Quick GPS Geolocation button */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          onChange({
                            ...filters,
                            lat: String(pos.coords.latitude),
                            lng: String(pos.coords.longitude),
                            radius: filters.radius || '25',
                            page: 1
                          });
                        },
                        (err) => {
                          alert(`GPS location error: ${err.message}`);
                        }
                      );
                    }
                  }}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shrink-0"
                  title="Search near device location"
                >
                  <Locate className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'newest'}
                onChange={(e) => handleInputChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Size: Largest First</option>
                <option value="area_asc">Size: Smallest First</option>
                {filters.radius && <option value="distance">Distance: Nearest First (PostGIS)</option>}
              </select>
            </div>
          </div>

          {/* Amenities & Features Tags */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Desired Amenities & Features (Relational Match)
            </label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity.id.toLowerCase());
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100/70 px-3 py-1.5 rounded-lg border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
