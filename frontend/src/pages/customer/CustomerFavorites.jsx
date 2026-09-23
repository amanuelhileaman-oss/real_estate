import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PropertyGrid from '../../components/property/PropertyGrid';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import { Heart, Search, ArrowRight, Home, Sparkles } from 'lucide-react';

export default function CustomerFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const loadFavorites = async (page = 1) => {
    try {
      setLoading(true);
      const res = await propertyService.getFavorites(page, 12);
      setFavorites(res.properties || []);
      setMeta(res.meta || { page, totalPages: 1, total: res.properties?.length || 0 });
    } catch (err) {
      console.error('Failed to load favorites:', err);
      addToast(err.message || 'Failed to load favorites', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites(1);
  }, []);

  const handleFavoriteToggle = (id, isFav) => {
    if (!isFav) {
      setFavorites((prev) => prev.filter((p) => p.id !== id));
      setMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    }
  };

  const filteredFavorites = search.trim()
    ? favorites.filter(
        (p) =>
          p.title?.toLowerCase().includes(search.toLowerCase()) ||
          p.city?.toLowerCase().includes(search.toLowerCase()) ||
          p.street_address?.toLowerCase().includes(search.toLowerCase())
      )
    : favorites;

  return (
    <DashboardLayout
      title="My Saved Favorites"
      subtitle="Compare bookmarked homes, track pricing, and quickly schedule viewing tours."
    >
      <div className="space-y-6">
        {/* Top Header & Search Bar */}
        {favorites.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                <Heart className="w-4 h-4 fill-current" />
              </span>
              <span className="text-xs font-bold text-slate-700">
                {meta.total} Saved Propert{meta.total === 1 ? 'y' : 'ies'}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter saved by title or city..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && favorites.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4 my-8">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">No Saved Properties Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Click the heart icon on any property card or detail page to bookmark listings you love for easy comparison.
              </p>
            </div>
            <Link to="/properties" className="inline-block pt-2">
              <Button variant="primary" size="md" className="gap-2">
                <Home className="w-4 h-4" />
                <span>Explore Property Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <PropertyGrid
              properties={filteredFavorites.map((f) => ({ ...f, isFavorited: true }))}
              loading={loading}
              onFavoriteToggle={handleFavoriteToggle}
            />

            {meta.totalPages > 1 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  hasNextPage={meta.hasNextPage}
                  hasPrevPage={meta.hasPrevPage}
                  onPageChange={(p) => loadFavorites(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
