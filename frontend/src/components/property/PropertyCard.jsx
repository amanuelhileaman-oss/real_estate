import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize2, MapPin, Heart, Navigation } from 'lucide-react';
import { formatCurrency, formatArea } from '../../utils/formatters';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../common/Badge';

export default function PropertyCard({ property, onFavoriteToggle, layout = 'grid' }) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [isFavorited, setIsFavorited] = useState(property.isFavorited || false);
  const [loadingFav, setLoadingFav] = useState(false);

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      addToast('Please sign in to save properties to your favorites.', 'info');
      return;
    }

    try {
      setLoadingFav(true);
      const res = await propertyService.toggleFavorite(property.id);
      setIsFavorited(res.favorited);
      addToast(res.favorited ? 'Added to favorites' : 'Removed from favorites', 'success');
      if (onFavoriteToggle) onFavoriteToggle(property.id, res.favorited);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoadingFav(false);
    }
  };

  const imageSrc = property.primary_image_url || property.media?.[0]?.url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80';
  const isRent = property.listing_type_code === 'FOR_RENT';
  const pricePeriodSuffix = isRent ? (property.price_period === 'MONTHLY' ? '/mo' : property.price_period ? `/${property.price_period.toLowerCase()}` : '/mo') : '';

  const isList = layout === 'list';

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 property-card-glow ${
        isList ? 'flex flex-col sm:flex-row' : 'flex flex-col'
      }`}
    >
      {/* Image Container */}
      <div
        className={`relative overflow-hidden bg-slate-100 ${
          isList ? 'sm:w-72 sm:shrink-0 aspect-[16/10] sm:aspect-auto' : 'aspect-[16/10]'
        }`}
      >
        <img
          src={imageSrc}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <Badge
            variant={isRent ? 'indigo' : 'primary'}
            className="shadow-sm backdrop-blur-md bg-white/95"
          >
            {property.listing_type_name || (isRent ? 'For Rent' : 'For Sale')}
          </Badge>
          {property.property_type_name && (
            <Badge variant="dark" className="shadow-sm backdrop-blur-md bg-slate-900/80">
              {property.property_type_name}
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          disabled={loadingFav}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-md z-10 ${
            isFavorited
              ? 'bg-rose-600 text-white'
              : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
          }`}
          title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Spatial Distance Indicator (if available via PostGIS) */}
        {property.distance_meters !== undefined && (
          <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow">
            <Navigation className="w-3 h-3 text-blue-400" />
            {(property.distance_meters / 1000).toFixed(1)} km away
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price */}
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-xl font-black text-slate-900 font-display">
              {formatCurrency(property.price, property.currency)}
            </span>
            {pricePeriodSuffix && (
              <span className="text-xs font-semibold text-slate-500">{pricePeriodSuffix}</span>
            )}
          </div>

          {/* Title */}
          <Link
            to={`/properties/${property.slug || property.id}`}
            className="block font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 text-base mb-1"
          >
            {property.title}
          </Link>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {property.street_address ? `${property.street_address}, ` : ''}{property.city}, {property.state_region || property.country}
            </span>
          </div>
        </div>

        {/* Specs footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4 text-slate-400" />
            <span>{property.bedrooms ?? 0} Beds</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4 text-slate-400" />
            <span>{property.bathrooms ?? 0} Baths</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{property.area_sqm ? `${Math.round(property.area_sqm)} m²` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
