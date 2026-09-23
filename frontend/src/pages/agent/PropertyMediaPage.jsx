import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Image as ImageIcon,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus
} from 'lucide-react';

export default function PropertyMediaPage() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [property, setProperty] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getPropertyDetails(id);
      setProperty(data);
      setMediaList(data.media || []);
    } catch (err) {
      console.error('Failed to load media:', err);
      addToast(err.message || 'Failed to load property photos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadMedia();
    }
  }, [id]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaList.length + files.length > 15) {
      addToast('A property can have a maximum of 15 photographs.', 'error');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      setUploading(true);
      await propertyService.uploadMedia(id, formData);
      addToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully!`, 'success');
      loadMedia();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this photo from the listing?')) {
      return;
    }

    try {
      setDeletingId(mediaId);
      await propertyService.deleteMedia(id, mediaId);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      addToast('Photo deleted', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete photo', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;

    const newList = [...mediaList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    setMediaList(newList);

    // Format payload for backend reorder
    const mediaOrders = newList.map((item, idx) => ({
      mediaId: item.id,
      sortOrder: idx + 1
    }));

    try {
      setSavingOrder(true);
      await propertyService.reorderMedia(id, mediaOrders);
    } catch (err) {
      addToast('Failed to update photo order', 'error');
      loadMedia();
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <DashboardLayout
      title="Property Photo Gallery & Media Management"
      subtitle="Upload, arrange, and manage high-resolution photographs representing your property."
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link to="/portal/agent/properties" className="hover:text-slate-900 transition flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to My Listings
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold truncate max-w-xs">{property?.title || 'Listing'}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Media</span>
          </div>

          {property && (
            <div className="flex items-center gap-2">
              <Link to={`/portal/agent/properties/${property.id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit Specs
                </Button>
              </Link>
              <Link to={`/properties/${property.slug || property.id}`} target="_blank">
                <Button variant="secondary" size="sm" className="gap-1">
                  <span>Public View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Upload Action Box */}
        <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors shadow-sm text-center relative">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileUpload}
            disabled={uploading || (mediaList.length >= 15)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="max-w-md mx-auto space-y-3 pointer-events-none">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              {uploading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {uploading ? 'Uploading Photographs...' : 'Click or Drag Photos Here to Upload'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload JPG, PNG, or WebP up to 10MB each (Maximum 15 photos per listing).
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              <span>{mediaList.length} / 15 Uploaded</span>
              {mediaList.length >= 15 && <span className="text-rose-600 font-bold">(Capacity Reached)</span>}
            </div>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Listing Gallery ({mediaList.length})
            </h2>
            {savingOrder && (
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving order...</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[16/10] bg-white rounded-2xl border border-slate-200" />
              ))}
            </div>
          ) : mediaList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No photos uploaded yet</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Listings with high-quality photos receive 400% more viewing requests from buyers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaList.map((m, index) => {
                const isPrimary = m.is_primary || index === 0;

                return (
                  <div
                    key={m.id || index}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img
                        src={m.url}
                        alt="Property photo"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />

                      {/* Primary badge */}
                      <div className="absolute top-3 left-3">
                        {isPrimary ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Cover Photo</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-900/70 text-white backdrop-blur-sm">
                            Photo #{index + 1}
                          </span>
                        )}
                      </div>

                      {/* Delete button */}
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="p-2 bg-white/90 hover:bg-rose-600 hover:text-white text-slate-700 rounded-xl backdrop-blur-sm transition shadow-md"
                          title="Delete photo"
                        >
                          {deletingId === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-mono text-[11px] text-slate-400">Position #{index + 1}</span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Left / Earlier"
                        >
                          <ArrowUp className="w-4 h-4 rotate-[-90deg]" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === mediaList.length - 1}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Right / Later"
                        >
                          <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
