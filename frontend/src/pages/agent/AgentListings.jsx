import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { apiRequest } from '../../services/api';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  PlusCircle,
  Eye,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Clock,
  Home,
  Pencil,
  Camera
} from 'lucide-react';
import EditListingModal from '../../components/property/EditListingModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';

export default function AgentListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { addToast } = useToast();

  const loadListings = async () => {
    try {
      setLoading(true);
      const url = statusFilter
        ? `/agents/my-listings?status=${statusFilter}`
        : '/agents/my-listings';
      const res = await apiRequest(url);
      setListings(res.data || []);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [statusFilter]);

  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      await propertyService.changeStatus(propertyId, newStatus);
      addToast(`Property marked as ${newStatus}`, 'success');
      loadListings();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAvailabilityChange = async (propertyId, newAvailability) => {
    try {
      await propertyService.changeAvailabilityStatus(propertyId, newAvailability);
      addToast(`Property marked as ${newAvailability}`, 'success');
      loadListings();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProperty) return;
    setDeleteLoading(true);
    try {
      await propertyService.deleteProperty(deletingProperty.id);
      addToast(`Listing "${deletingProperty.title}" deleted successfully.`, 'success');
      setDeletingProperty(null);
      loadListings();
    } catch (err) {
      addToast(err.message || 'Failed to delete listing', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="My Property Listings"
      subtitle="Manage your active portfolio, review draft submissions, and update deal statuses."
    >
      <div className="space-y-6">
        {/* Actions & Filters bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            {['', 'ACTIVE', 'PENDING_APPROVAL', 'SOLD', 'RENTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st ? st.replace('_', ' ') : 'All Listings'}
              </button>
            ))}
          </div>

          <Link to="/portal/agent/properties/new" className="shrink-0">
            <Button variant="primary" size="md">
              <PlusCircle className="w-4 h-4" />
              <span>Add New Listing</span>
            </Button>
          </Link>
        </div>

        {/* Listings Table / Cards */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No listings found</h3>
            <p className="text-xs text-slate-500 mb-6">You have no listings matching this status.</p>
            <Link to="/portal/agent/properties/new">
              <Button variant="primary">Create First Listing</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Property</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.primary_image_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=150&q=80'}
                            alt=""
                            className="w-12 h-10 object-cover rounded-lg shrink-0"
                          />
                          <div>
                            <Link
                              to={`/properties/${item.slug || item.id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1"
                            >
                              {item.title}
                            </Link>
                            <span className="text-[11px] text-slate-400">
                              {item.street_address}, {item.city}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {item.property_type_name} ({item.listing_type_name})
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(item.price, item.currency)}
                        {item.price_period && (
                          <span className="text-[10px] text-slate-400 font-normal">/{item.price_period.toLowerCase()}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              item.status_code === 'ACTIVE'
                                ? 'emerald'
                                : item.status_code === 'PENDING_APPROVAL'
                                ? 'amber'
                                : item.status_code === 'REJECTED'
                                ? 'rose'
                                : 'default'
                            }
                          >
                            {item.status_name}
                          </Badge>
                          {item.availability_status && item.availability_status !== 'AVAILABLE' && (
                            <Badge variant={item.availability_status === 'SOLD' ? 'rose' : item.availability_status === 'RENTED' ? 'amber' : 'slate'} className="text-[10px] uppercase">
                              {item.availability_status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProperty(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Listing & Location"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/portal/agent/properties/${item.id}/media`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Manage Photographs & Media"
                          >
                            <Camera className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/properties/${item.slug || item.id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {item.status_code === 'ACTIVE' && item.availability_status === 'AVAILABLE' && (
                            <>
                              {item.listing_type_code === 'FOR_SALE' && (
                                <button
                                  onClick={() => handleAvailabilityChange(item.id, 'SOLD')}
                                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
                                >
                                  Mark Sold
                                </button>
                              )}
                              {item.listing_type_code === 'FOR_RENT' && (
                                <button
                                  onClick={() => handleAvailabilityChange(item.id, 'RENTED')}
                                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition-colors"
                                >
                                  Mark Rented
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => setDeletingProperty(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Permanently Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Listing & Location Modal */}
        <EditListingModal
          property={editingProperty}
          isOpen={Boolean(editingProperty)}
          onClose={() => setEditingProperty(null)}
          onUpdated={() => loadListings()}
        />

        {/* Confirm Delete Listing Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(deletingProperty)}
          onClose={() => setDeletingProperty(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Listing: ${deletingProperty?.title}`}
          message={`Are you sure you want to permanently delete listing "${deletingProperty?.title}"? All associated photographs, inquiries, viewing appointments, and offers will be permanently removed.`}
          confirmLabel="Delete Listing"
          loading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
}
