import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import PropertyFilterBar from '../components/property/PropertyFilterBar';
import PropertyGrid from '../components/property/PropertyGrid';
import InteractiveMap from '../components/map/InteractiveMap';
import Pagination from '../components/common/Pagination';
import { Compass, Sparkles } from 'lucide-react';

export default function PropertyCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const initialFilters = {
    query: searchParams.get('query') || '',
    type: searchParams.get('type') || '',
    listingType: searchParams.get('listingType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minBeds: searchParams.get('minBeds') || '',
    minBaths: searchParams.get('minBaths') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    furnishedStatus: searchParams.get('furnishedStatus') || '',
    amenities: searchParams.get('amenities') || '',
    city: searchParams.get('city') || '',
    location: searchParams.get('location') || '',
    lat: searchParams.get('lat') || '',
    lng: searchParams.get('lng') || '',
    radius: searchParams.get('radius') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page'), 10) || 1
  };

  const [filters, setFilters] = useState(initialFilters);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(searchParams.get('view') === 'map' ? 'map' : 'grid');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Sync state to URL and fetch properties
  useEffect(() => {
    async function loadProperties() {
      try {
        setLoading(true);
        const { properties: items, meta: pageMeta } = await propertyService.getProperties(filters);
        setProperties(items);
        setMeta(pageMeta || { page: 1, totalPages: 1, total: items.length });
      } catch (err) {
        console.error('Failed to query properties:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProperties();

    // Update URL search parameters
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (viewMode === 'map') params.set('view', 'map');
    setSearchParams(params, { replace: true });
  }, [filters, viewMode, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      query: '',
      type: '',
      listingType: '',
      minPrice: '',
      maxPrice: '',
      minBeds: '',
      minBaths: '',
      minArea: '',
      maxArea: '',
      furnishedStatus: '',
      amenities: '',
      city: '',
      location: '',
      lat: '',
      lng: '',
      radius: '',
      sortBy: 'newest',
      page: 1
    });
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Map center calculation
  const mapCenter = filters.lat && filters.lng
    ? [parseFloat(filters.lat), parseFloat(filters.lng)]
    : properties.length > 0 && properties[0].latitude
    ? [parseFloat(properties[0].latitude), parseFloat(properties[0].longitude)]
    : [30.2672, -97.7431];

  const radiusMeters = filters.radius ? parseFloat(filters.radius) * 1000 : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 font-display">
          Properties Marketplace
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Showing {meta.total || 0} active residential and commercial real-estate listings
          {filters.radius && (
            <span className="text-blue-600 font-semibold inline-flex items-center gap-1 ml-1.5">
              <Compass className="w-3.5 h-3.5 inline" /> within {filters.radius}km PostGIS radius
            </span>
          )}
        </p>
      </div>

      {/* Filter Bar */}
      <PropertyFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      {viewMode === 'map' ? (
        /* Split Map + Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map on Left (sticky) */}
          <div className="lg:col-span-6 sticky top-28 z-20">
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-md">
              <InteractiveMap
                properties={properties}
                center={mapCenter}
                zoom={filters.radius ? 11 : 12}
                radiusMeters={radiusMeters}
                activePropertyId={selectedPropertyId}
                onMarkerClick={(p) => setSelectedPropertyId(p.id)}
                className="h-[550px] w-full rounded-xl"
              />
            </div>
          </div>

          {/* Cards on Right */}
          <div className="lg:col-span-6 space-y-6">
            <PropertyGrid properties={properties} loading={loading} layout="grid" />
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              hasNextPage={meta.hasNextPage}
              hasPrevPage={meta.hasPrevPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      ) : (
        /* Standard Grid or List View */
        <div className="space-y-6">
          <PropertyGrid properties={properties} loading={loading} layout={viewMode === 'list' ? 'list' : 'grid'} />
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            hasNextPage={meta.hasNextPage}
            hasPrevPage={meta.hasPrevPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
