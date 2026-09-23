import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import PropertyGrid from '../components/property/PropertyGrid';
import InteractiveMap from '../components/map/InteractiveMap';
import Button from '../components/common/Button';
import {
  Building2,
  Search,
  Compass,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Users,
  Award
} from 'lucide-react';
import { PROPERTY_TYPES } from '../utils/constants';

export default function HomePage() {
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [listingType, setListingType] = useState('FOR_SALE');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadFeatured() {
      try {
        setLoading(true);
        const { properties } = await propertyService.getProperties({ limit: 6, sortBy: 'newest' });
        setFeaturedProperties(properties);
      } catch (err) {
        console.error('Failed to load featured properties:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity) params.append('query', searchCity);
    if (selectedType) params.append('type', selectedType);
    if (listingType) params.append('listingType', listingType);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-semibold backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Next-Gen Geospatial Real Estate Discovery</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white leading-[1.12]">
              Find Your Sanctuary with <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-200 bg-clip-text text-transparent">Spatial Precision</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              Explore handpicked luxury homes, waterfront villas, modern lofts, and commercial spaces backed by PostGIS spatial calculations and verified agents.
            </p>

            {/* Hero Search Box */}
            <div className="pt-4 max-w-2xl mx-auto">
              <form
                onSubmit={handleHeroSearch}
                className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-white/20 text-slate-900 text-left flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                {/* Buy / Rent pill */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setListingType('FOR_SALE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      listingType === 'FOR_SALE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingType('FOR_RENT')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      listingType === 'FOR_RENT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Rent
                  </button>
                </div>

                {/* City / Keyword input */}
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="City or Neighborhood (e.g. Austin, Beverly Hills)..."
                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                {/* Property Type Dropdown */}
                <div className="shrink-0 sm:border-l sm:border-slate-200 sm:pl-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full sm:w-36 py-2 px-2 text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
                  >
                    <option value="">All Types</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search submit button */}
                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </Button>
              </form>

              {/* Quick Type Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
                <span className="text-slate-400 font-medium">Popular:</span>
                {['VILLA', 'HOUSE', 'CONDO', 'APARTMENT', 'OFFICE'].map((typeCode) => (
                  <button
                    key={typeCode}
                    type="button"
                    onClick={() => navigate(`/properties?type=${typeCode}`)}
                    className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {PROPERTY_TYPES.find((t) => t.code === typeCode)?.name || typeCode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Platform Highlights / Metrics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-3xl font-black text-slate-900 font-display">100%</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
              Verified Listings
            </div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-3xl font-black text-blue-600 font-display">PostGIS</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
              Spatial Geo Engine
            </div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-3xl font-black text-slate-900 font-display">4.9/5</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
              Agent Rating Avg
            </div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-black text-slate-900 font-display">24/7</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
              Tour Scheduling
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Properties Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Curated Selection
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">
              Featured Exclusive Residences
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <PropertyGrid properties={featuredProperties} loading={loading} />
      </section>

      {/* 4. Interactive Map Search Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Geospatial Proximity Search</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display leading-tight">
                Search Properties by Precise Geographic Radius
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Discover properties within walking distance or exact driving radius from downtown or work corridors. Our PostGIS database computes distance down to the meter.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link to="/properties?view=map">
                  <Button variant="primary" size="lg" className="shadow-blue-500/30">
                    <Compass className="w-4 h-4" />
                    Launch Interactive Map
                  </Button>
                </Link>
                <Link to="/properties?lat=30.2672&lng=-97.7431&radius=10">
                  <Button variant="outline" size="lg" className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800">
                    Austin (10km Radius)
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <InteractiveMap
                properties={featuredProperties}
                center={[30.2672, -97.7431]}
                zoom={12}
                radiusMeters={10000}
                className="h-80 sm:h-96 w-full rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role Call-to-Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Agents */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-5">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display mb-2">
              Are you a Licensed Real Estate Agent?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Showcase your listings to qualified buyers. Manage inquiries, photo galleries, and property viewings with our dedicated Agent Portal.
            </p>
            <Link to="/portal/agent/properties/new">
              <Button variant="secondary" size="md">
                <span>Start Listing Properties</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* For Buyers / Renters */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display mb-2">
              Looking for Your Dream Home?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Save your favorite properties, send direct messages to listing agents, and schedule in-person tours at times that fit your calendar.
            </p>
            <Link to="/properties">
              <Button variant="primary" size="md">
                <span>Browse All Homes</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
