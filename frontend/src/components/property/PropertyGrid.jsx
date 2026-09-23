import React from 'react';
import PropertyCard from './PropertyCard';
import { Home } from 'lucide-react';

export default function PropertyGrid({ properties = [], loading = false, onFavoriteToggle, layout = 'grid' }) {
  const isList = layout === 'list';

  if (loading) {
    return (
      <div className={isList ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse ${
              isList ? 'flex flex-col sm:flex-row h-52' : ''
            }`}
          >
            <div className={isList ? 'sm:w-72 bg-slate-200' : 'aspect-[16/10] bg-slate-200'} />
            <div className="p-5 space-y-3 flex-1">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-16" />
                <div className="h-4 bg-slate-200 rounded w-16" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No listings found</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          We couldn't find any properties matching your exact search filters or geographic radius. Try adjusting your price range or expanding your search area.
        </p>
      </div>
    );
  }

  return (
    <div className={isList ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          onFavoriteToggle={onFavoriteToggle}
          layout={layout}
        />
      ))}
    </div>
  );
}
