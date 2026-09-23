import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import InteractiveMap from '../components/map/InteractiveMap';
import InquiryModal from '../components/inquiry/InquiryModal';
import ViewingModal from '../components/inquiry/ViewingModal';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { formatCurrency, formatArea, formatDate } from '../utils/formatters';
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Heart,
  MessageSquare,
  ShieldCheck,
  Check,
  Eye,
  Car,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  Star,
  ChevronLeft,
  ExternalLink,
  Flag,
  DollarSign,
  FileText,
  Handshake
} from 'lucide-react';
import ReportPropertyModal from '../components/property/ReportPropertyModal';
import BuyOfferModal from '../components/deals/BuyOfferModal';
import RentalApplicationModal from '../components/deals/RentalApplicationModal';

export default function PropertyDetailPage() {
  const { slugOrId } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [buyOfferModalOpen, setBuyOfferModalOpen] = useState(false);
  const [rentalModalOpen, setRentalModalOpen] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const data = await propertyService.getPropertyDetails(slugOrId);
        setProperty(data);
        setIsFavorited(data.isFavorited || false);
      } catch (err) {
        console.error('Failed to load property details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [slugOrId]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      addToast('Please sign in to save properties to your favorites.', 'info');
      return;
    }
    try {
      const res = await propertyService.toggleFavorite(property.id);
      setIsFavorited(res.favorited);
      addToast(res.favorited ? 'Added to your favorites!' : 'Removed from your favorites', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-96 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">Listing Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This property may have been removed, archived, or is currently under moderation review.
        </p>
        <Link to="/properties">
          <Button variant="primary">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  const mediaList = property.media && property.media.length > 0
    ? property.media
    : [{ url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80' }];

  const activeImage = mediaList[activeImageIndex] || mediaList[0];
  const isRent = property.listing_type_code === 'FOR_RENT';
  const pricePeriodSuffix = isRent ? (property.price_period === 'MONTHLY' ? '/month' : property.price_period ? `/${property.price_period.toLowerCase()}` : '/month') : '';

  const propertyFeatures = Array.isArray(property.features)
    ? property.features
    : typeof property.features === 'string'
      ? JSON.parse(property.features || '[]')
      : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link to="/properties" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Catalog
        </Link>
        <span>/</span>
        <span className="text-slate-700">{property.city}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{property.title}</span>
      </div>

      {/* Hero Image Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-[16/9] max-h-[540px] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
          <img
            src={activeImage.url}
            alt={property.title}
            className="w-full h-full object-cover"
          />

          {/* Top Overlays */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            <Badge variant={isRent ? 'indigo' : 'primary'} className="bg-white/95 backdrop-blur-md shadow text-xs">
              {property.listing_type_name || (isRent ? 'For Rent' : 'For Sale')}
            </Badge>
            <Badge variant="dark" className="bg-slate-950/80 backdrop-blur-md text-xs">
              {property.property_type_name}
            </Badge>
            {property.status_code !== 'ACTIVE' && (
              <Badge variant="amber" className="bg-amber-400 text-slate-950 font-bold shadow text-xs">
                Status: {property.status_name}
              </Badge>
            )}
          </div>

          {/* Top Right Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-full backdrop-blur-md transition-all shadow-lg ${isFavorited
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/90 text-slate-700 hover:text-rose-600 hover:bg-white'
                }`}
              title={isFavorited ? 'Remove Favorite' : 'Save Favorite'}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thumbnail Selector Strip */}
        {mediaList.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {mediaList.map((m, idx) => (
              <button
                key={m.id || idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
              >
                <img src={m.thumbnail_url || m.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Specs, Story, Amenities, Map */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Title & Price */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">
                {property.title}
              </h1>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 font-display shrink-0">
                {formatCurrency(property.price, property.currency)}
                {pricePeriodSuffix && (
                  <span className="text-sm font-normal text-slate-500">{pricePeriodSuffix}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {property.street_address}, {property.city}, {property.state_region} {property.postal_code}, {property.country}
              </span>
            </div>
          </div>

          {/* Key Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Bedrooms</div>
                <div className="text-base font-bold text-slate-900">{property.bedrooms ?? 0} Beds</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Bath className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Bathrooms</div>
                <div className="text-base font-bold text-slate-900">{property.bathrooms ?? 0} Baths</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Living Area</div>
                <div className="text-base font-bold text-slate-900">{Math.round(property.area_sqm || 0)} m²</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Parking</div>
                <div className="text-base font-bold text-slate-900">{property.parking_spaces || 0} Cars</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 font-display">About this residence</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Features / Amenities */}
          {propertyFeatures.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 font-display">Features & Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {propertyFeatures.map((feat) => (
                  <div
                    key={feat}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-800 capitalize"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{feat.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & PostGIS Interactive Map */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Geographic Location & Surroundings
                </h2>
                <p className="text-xs text-slate-500">
                  Exact location persisted with PostgreSQL PostGIS spatial geography (WGS84 SRID 4326)
                </p>
              </div>
              {property.latitude && property.longitude && (
                <div className="flex items-center gap-2">
                  <div className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    {Number(property.latitude).toFixed(6)}°, {Number(property.longitude).toFixed(6)}°
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 transition-colors"
                  >
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Address Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Address: </span>
                <span>
                  {property.street_address ? `${property.street_address}, ` : ''}
                  {property.subcity_district ? `${property.subcity_district}, ` : ''}
                  {property.city}, {property.state_region || ''} {property.postal_code || ''}, {property.country}
                </span>
              </div>
            </div>

            {/* Interactive Map */}
            {property.latitude && property.longitude && !isNaN(parseFloat(property.latitude)) && !isNaN(parseFloat(property.longitude)) ? (
              <InteractiveMap
                properties={[property]}
                center={[parseFloat(property.latitude), parseFloat(property.longitude)]}
                zoom={15}
                activePropertyId={property.id}
                className="h-96 w-full rounded-2xl shadow-sm border border-slate-200"
              />
            ) : (
              <div className="h-48 w-full rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Coordinates not provided</p>
                <p className="text-[11px] text-slate-400 mt-1">Exact map coordinates have not been published for this listing.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Agent Card & Action Buttons */}
        <div className="lg:col-span-4 sticky top-28 space-y-6">
          {/* Action CTAs */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3.5 transition-colors">
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-2xl font-black text-slate-900 dark:text-white font-display">
                {formatCurrency(property.price, property.currency)}
                {pricePeriodSuffix && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{pricePeriodSuffix}</span>}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                {isRent ? 'Available for Lease & Move-in' : 'Available for Purchase & Escrow'}
              </div>
            </div>

            {/* Primary Action: Buy Offer or Rent Application */}
            {isRent ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25"
                onClick={() => setRentalModalOpen(true)}
              >
                <FileText className="w-4 h-4" />
                Apply to Rent / Lease
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25"
                onClick={() => setBuyOfferModalOpen(true)}
              >
                <DollarSign className="w-4 h-4" />
                Make an Offer to Buy
              </Button>
            )}

            {/* Live Chat with Agent */}
            <Link
              to={`/portal/chat?recipientId=${property.agent_id}&propertyId=${property.id}&initialMessage=${encodeURIComponent(`Hi, I'm interested in "${property.title}". Could you provide more details?`)}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              Live Chat with Agent
            </Link>

            {/* Schedule Tour */}
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setViewingModalOpen(true)}
            >
              <Calendar className="w-4 h-4" />
              Schedule a Viewing Tour
            </Button>

            {/* General Inquiry */}
            <button
              onClick={() => setInquiryModalOpen(true)}
              className="w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pt-1 cursor-pointer"
            >
              Ask a question via quick inquiry form →
            </button>

            <p className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
              Direct connection with licensed listing agent. Protected deal workflow.
            </p>
          </div>

          {/* Assigned Agent Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Listing Agent
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow">
                {property.agent_first_name?.[0] || 'A'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {property.agent_first_name} {property.agent_last_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{property.agency_name || 'Premier Realty'}</p>
                {property.license_number && (
                  <p className="text-[10px] text-slate-400 font-mono">Lic: {property.license_number}</p>
                )}
              </div>
            </div>

            {property.rating_avg > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl">
                <Star className="w-4 h-4 fill-current text-amber-500" />
                <span>{property.rating_avg} / 5.0</span>
                <span className="text-slate-400 font-normal">({property.review_count || 0} reviews)</span>
              </div>
            )}

            {property.agent_bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-3">
                "{property.agent_bio}"
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              {property.agent_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{property.agent_phone}</span>
                </div>
              )}
              {property.agent_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{property.agent_email}</span>
                </div>
              )}
            </div>

            <Link
              to={`/agents/profile/${property.agent_id}`}
              className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
            >
              View Agent's Other Listings →
            </Link>
          </div>

          {/* Report Listing Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report this listing to moderation</span>
          </button>
        </div>
      </div>

      {/* Inquiry, Tour, Buy Offer, Rental Application, and Report Modals */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        property={property}
      />
      <ViewingModal
        isOpen={viewingModalOpen}
        onClose={() => setViewingModalOpen(false)}
        property={property}
      />
      <BuyOfferModal
        isOpen={buyOfferModalOpen}
        onClose={() => setBuyOfferModalOpen(false)}
        property={property}
      />
      <RentalApplicationModal
        isOpen={rentalModalOpen}
        onClose={() => setRentalModalOpen(false)}
        property={property}
      />
      <ReportPropertyModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        property={property}
      />
    </div>
  );
}
