import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function AdminModerationQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await adminService.getModerationQueue();
      setQueue(res.properties || []);
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (property) => {
    try {
      setActionLoading(true);
      await adminService.approveListing(property.id);
      addToast(`"${property.title}" has been approved and published live!`, 'success');
      loadQueue();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (property) => {
    setSelectedProperty(property);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      addToast('Please provide a specific rejection reason of at least 5 characters.', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await adminService.rejectListing(selectedProperty.id, rejectionReason);
      addToast(`Listing rejected. Feedback sent to agent.`, 'info');
      setRejectModalOpen(false);
      loadQueue();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Property Moderation Queue"
      subtitle="Review agent-submitted listings, verify photos and PostGIS location, and approve for public publication."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-3xl border border-slate-200" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">Moderation Queue Clear!</h3>
            <p className="text-xs text-slate-500 mb-4">
              All submitted listings have been reviewed and approved. Newly created listings will appear here automatically.
            </p>
            <Link to="/admin/properties">
              <Button variant="outline" size="sm">Inspect All Live Properties</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{queue.length} listing{queue.length > 1 ? 's' : ''} awaiting moderation review</span>
            </div>

            {queue.map((prop) => (
              <div
                key={prop.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col lg:flex-row gap-6 items-start justify-between"
              >
                {/* Image + Core Details */}
                <div className="flex flex-col sm:flex-row gap-5 flex-1 min-w-0">
                  <img
                    src={prop.primary_image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                    alt=""
                    className="w-full sm:w-56 h-40 object-cover rounded-2xl shrink-0"
                  />

                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="amber" className="text-[10px] font-bold">
                        Pending Admin Approval
                      </Badge>
                      <Badge variant="primary" className="text-[10px]">
                        {prop.property_type_name} ({prop.listing_type_name})
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        Submitted {formatDate(prop.created_at)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 font-display">
                      {prop.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{prop.street_address}, {prop.city}, {prop.state_region}</span>
                    </div>

                    {/* PostGIS Coordinate */}
                    <div className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                      PostGIS SRID 4326: {Number(prop.latitude).toFixed(5)}°, {Number(prop.longitude).toFixed(5)}°
                    </div>

                    {/* Specs */}
                    <div className="flex items-center gap-4 text-xs text-slate-700 pt-1 font-semibold">
                      <span>{formatCurrency(prop.price, prop.currency)}</span>
                      <span>•</span>
                      <span>{prop.bedrooms ?? 0} Beds</span>
                      <span>•</span>
                      <span>{prop.bathrooms ?? 0} Baths</span>
                      <span>•</span>
                      <span>{Math.round(prop.area_sqm || 0)} m²</span>
                    </div>

                    {/* Agent Info */}
                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Agent:</span>
                      <span>{prop.agent_first_name} {prop.agent_last_name}</span>
                      <span className="text-slate-400">• {prop.agency_name}</span>
                      {prop.license_number && (
                        <span className="font-mono text-slate-400">({prop.license_number})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderation Decision Buttons */}
                <div className="shrink-0 flex sm:flex-col gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={actionLoading}
                    onClick={() => handleApprove(prop)}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 flex-1 sm:flex-none justify-center"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Publish
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    disabled={actionLoading}
                    onClick={() => handleOpenReject(prop)}
                    className="text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex-1 sm:flex-none justify-center"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Listing
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal with mandatory feedback */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Listing with Moderation Feedback"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-800">
            Please provide a constructive reason for rejecting <strong>"{selectedProperty?.title}"</strong>. The agent will receive this feedback to amend their listing.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Reason for Rejection (Required)
            </label>
            <textarea
              rows={4}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Inaccurate street address, blurry photographic images, or incorrect property category selected..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={actionLoading}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
