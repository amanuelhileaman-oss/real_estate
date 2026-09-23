import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Home,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings2,
  X,
  ShieldAlert,
  Loader2,
  Info,
  Clock,
  Pencil,
  Trash2
} from 'lucide-react';
import EditListingModal from '../../components/property/EditListingModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active / Published' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'ARCHIVED', label: 'Archived (Inappropriate / Taken Down)' }
];

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const { addToast } = useToast();

  // Status Change Modal State
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit & Delete Listing Modal States
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Rejection Reason Inspector Modal
  const [viewReasonProperty, setViewReasonProperty] = useState(null);

  const loadProperties = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getAllProperties({
        page,
        status: statusFilter || 'ALL',
        search
      });
      setProperties(res.properties || []);
      setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load admin properties:', err);
      addToast(err.message || 'Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties(1);
  }, [statusFilter, search]);

  const handleApprove = async (id) => {
    try {
      await adminService.approveListing(id);
      addToast('Listing approved and published live', 'success');
      loadProperties(meta.page);
    } catch (err) {
      addToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleOpenStatusModal = (property) => {
    setSelectedProperty(property);
    setNewStatus(property.status_code || 'ACTIVE');
    setStatusReason(property.rejection_reason || '');
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;

    if (newStatus === 'REJECTED' && (!statusReason || statusReason.trim().length < 5)) {
      addToast('Rejection reason of at least 5 characters is required.', 'error');
      return;
    }

    try {
      setUpdatingStatus(true);
      await adminService.changePropertyStatus(selectedProperty.id, newStatus, statusReason.trim() || null);
      addToast(`Property status updated to ${newStatus}`, 'success');
      setStatusModalOpen(false);
      setSelectedProperty(null);
      loadProperties(meta.page);
    } catch (err) {
      addToast(err.message || 'Failed to change property status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProperty) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteProperty(deletingProperty.id);
      addToast(`Listing "${deletingProperty.title}" permanently removed.`, 'success');
      setDeletingProperty(null);
      loadProperties(meta.page);
    } catch (err) {
      addToast(err.message || 'Failed to delete property', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="All Platform Properties"
      subtitle="Complete database inventory across all registered agents and statuses. Moderate, change status, and view rejection details."
    >
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            {[
              { value: '', label: 'All Listings' },
              { value: 'PENDING_APPROVAL', label: 'Pending' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'SOLD', label: 'Sold' },
              { value: 'RENTED', label: 'Rented' },
              { value: 'ARCHIVED', label: 'Archived' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, address, or city..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No properties found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your status filter or search keywords.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Listing Title & Location</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Agent</th>
                    <th className="py-3.5 px-4">Status & Flags</th>
                    <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {properties.map((p) => {
                    const isPending = p.status_code === 'PENDING' || p.status_code === 'PENDING_APPROVAL';
                    const isRejected = p.status_code === 'REJECTED';
                    const isActive = p.status_code === 'ACTIVE';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {p.street_address}, {p.city}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.property_type_name || p.property_type_code}
                          <span className="text-[10px] text-slate-400 block">
                            {p.listing_type_name || p.listing_type_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                          {formatCurrency(p.price, p.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="font-semibold text-slate-800">
                            {p.agent_first_name} {p.agent_last_name}
                          </div>
                          <div className="text-[10px] text-slate-400">{p.agent_email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant={
                                isActive
                                  ? 'emerald'
                                  : isPending
                                  ? 'amber'
                                  : isRejected
                                  ? 'rose'
                                  : p.status_code === 'ARCHIVED'
                                  ? 'dark'
                                  : 'default'
                              }
                            >
                              {p.status_name || p.status_code}
                            </Badge>

                            {isRejected && p.rejection_reason && (
                              <button
                                onClick={() => setViewReasonProperty(p)}
                                className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition"
                                title="View Rejection Reason"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Listing */}
                            <Link
                              to={`/properties/${p.slug || p.id}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Public View"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>

                            {/* Quick Approve for Pending */}
                            {isPending && (
                              <button
                                onClick={() => handleApprove(p.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            {/* Edit Property Listing */}
                            <button
                              onClick={() => setEditingProperty(p)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Listing Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Change Status Modal trigger */}
                            <button
                              onClick={() => handleOpenStatusModal(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Change Status / Rejection Reason"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              <span>Status</span>
                            </button>

                            {/* Delete Property Listing */}
                            <button
                              onClick={() => setDeletingProperty(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Permanently Delete Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                hasNextPage={meta.hasNextPage}
                hasPrevPage={meta.hasPrevPage}
                onPageChange={(p) => loadProperties(p)}
              />
            </div>
          </div>
        )}

        {/* Change Status Modal */}
        {statusModalOpen && selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <span>Update Property Status</span>
                </div>
                <button
                  onClick={() => setStatusModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Target Property</div>
                  <div className="text-sm font-bold text-slate-900 line-clamp-1">{selectedProperty.title}</div>
                  <div className="text-xs text-slate-400">Current status: {selectedProperty.status_code}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newStatus === 'REJECTED' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Rejection Reason (Required)
                    </label>
                    <textarea
                      rows={3}
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Specify clear feedback for the agent (e.g. Inaccurate photos, missing license)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                )}

                {newStatus === 'ARCHIVED' && (
                  <div className="p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                    <span className="font-bold">Notice:</span> Archiving immediately removes the listing from the public discovery map and search index. Useful for inappropriate or duplicate listings.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalOpen(false)}
                    disabled={updatingStatus}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Status</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Rejection Reason Modal */}
        {viewReasonProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/50">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Rejection Feedback Details</span>
                </div>
                <button
                  onClick={() => setViewReasonProperty(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">Property</div>
                  <div className="text-sm font-bold text-slate-900">{viewReasonProperty.title}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">Agent</div>
                  <div className="text-xs text-slate-700">
                    {viewReasonProperty.agent_first_name} {viewReasonProperty.agent_last_name} ({viewReasonProperty.agent_email})
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Moderator Reason
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed italic">
                    "{viewReasonProperty.rejection_reason || 'No specific feedback provided.'}"
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewReasonProperty(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Listing Modal */}
        <EditListingModal
          property={editingProperty}
          isOpen={Boolean(editingProperty)}
          onClose={() => setEditingProperty(null)}
          onUpdated={() => loadProperties(meta.page)}
        />

        {/* Confirm Delete Property Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(deletingProperty)}
          onClose={() => setDeletingProperty(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Listing: ${deletingProperty?.title}`}
          message={`Are you sure you want to permanently delete listing "${deletingProperty?.title}"? All photographs, tour appointments, inquiries, and offers will be permanently removed.`}
          confirmLabel="Delete Listing"
          loading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
}
