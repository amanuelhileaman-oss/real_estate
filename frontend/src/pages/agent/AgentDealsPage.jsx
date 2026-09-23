import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dealService } from '../../services/dealService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import {
  Handshake,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  MessageSquare,
  User,
  Phone,
  Mail,
  X,
  Send,
  Eye
} from 'lucide-react';

export default function AgentDealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  // Action Modals State
  const [counterModalDeal, setCounterModalDeal] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [rejectModalDeal, setRejectModalDeal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const data = await dealService.getAgentDeals({
        dealType: typeFilter || undefined,
        status: statusFilter || undefined
      });
      setDeals(data);
    } catch (err) {
      console.error('Failed to load agent deals:', err);
      addToast('Failed to load incoming offers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, [typeFilter, statusFilter]);

  const handleAcceptDeal = async (deal) => {
    const isBuy = deal.deal_type === 'BUY_OFFER';
    const targetStatusText = isBuy ? 'SOLD' : 'RENTED';

    if (!window.confirm(`Accept this ${isBuy ? 'buy offer' : 'rental application'}? This will automatically update your property status to ${targetStatusText}.`)) {
      return;
    }

    try {
      await dealService.updateDealStatus(deal.id, {
        status: 'ACCEPTED',
        agentNotes: 'Offer officially accepted by listing agent.'
      });
      addToast(`Offer accepted! Listing transitioned to ${targetStatusText}.`, 'success');
      loadDeals();
    } catch (err) {
      addToast(err.message || 'Failed to accept offer', 'error');
    }
  };

  const handleSendCounter = async (e) => {
    e.preventDefault();
    if (!counterModalDeal) return;

    const numCounter = parseFloat(counterAmount);
    if (isNaN(numCounter) || numCounter <= 0) {
      addToast('Please enter a valid counter amount.', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      await dealService.updateDealStatus(counterModalDeal.id, {
        status: 'COUNTERED',
        counterAmount: numCounter,
        agentNotes: counterNotes
      });
      addToast('Counter-offer sent to the applicant.', 'success');
      setCounterModalDeal(null);
      setCounterAmount('');
      setCounterNotes('');
      loadDeals();
    } catch (err) {
      addToast(err.message || 'Failed to send counter-offer', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectDeal = async (e) => {
    e.preventDefault();
    if (!rejectModalDeal) return;

    setSubmittingAction(true);
    try {
      await dealService.updateDealStatus(rejectModalDeal.id, {
        status: 'REJECTED',
        agentNotes: rejectReason || 'Offer declined by listing advisor.'
      });
      addToast('Offer marked as declined.', 'info');
      setRejectModalDeal(null);
      setRejectReason('');
      loadDeals();
    } catch (err) {
      addToast(err.message || 'Failed to decline offer', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="emerald">Accepted</Badge>;
      case 'COUNTERED':
        return <Badge variant="amber">Counter Sent</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="default">Applicant Withdrawn</Badge>;
      default:
        return <Badge variant="primary">Needs Review</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Offers & Lease Applications"
      subtitle="Review incoming purchase offers, evaluate rental tenant applications, negotiate counter-offers, and close deals."
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: '', label: 'All Deals' },
              { id: 'BUY_OFFER', label: 'Buy Offers' },
              { id: 'RENT_APPLICATION', label: 'Rental Applications' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="COUNTERED">Countered</option>
              <option value="ACCEPTED">Accepted / Closed</option>
              <option value="REJECTED">Declined</option>
            </select>
          </div>
        </div>

        {/* List of deals */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <Handshake className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No incoming offers or applications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              When prospective buyers or tenants submit offers on your listings, they will appear here with full term breakdowns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => {
              const isBuy = deal.deal_type === 'BUY_OFFER';
              const terms = typeof deal.terms === 'string' ? JSON.parse(deal.terms || '{}') : deal.terms || {};

              return (
                <div
                  key={deal.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                        isBuy
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {isBuy ? <DollarSign className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-display">
                            {isBuy ? 'Purchase Offer' : 'Rental Lease Application'}
                          </span>
                          {getStatusBadge(deal.status)}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Submitted {formatDate(deal.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Quick actions for pending deals */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/portal/chat?recipientId=${deal.customer_id}&propertyId=${deal.property_id}`}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Chat with Applicant"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>

                      {deal.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAcceptDeal(deal)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => {
                              setCounterModalDeal(deal);
                              setCounterAmount(deal.amount);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Counter-Offer
                          </button>
                          <button
                            onClick={() => setRejectModalDeal(deal)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Main Grid: Property | Financial Offer | Terms Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Property Context */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                      <img
                        src={deal.property_image_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=200&q=80'}
                        alt=""
                        className="w-16 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/properties/${deal.property_slug || deal.property_id}`}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 truncate block"
                        >
                          {deal.property_title}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate">{deal.property_city}</div>
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          List Price: {formatCurrency(deal.property_listing_price, deal.property_currency)}
                        </div>
                      </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Applicant / Buyer</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {deal.customer_first_name} {deal.customer_last_name}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{deal.customer_email}</span>
                      </div>
                      {deal.customer_phone && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{deal.customer_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Terms */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isBuy ? 'Proposed Purchase Amount' : 'Proposed Monthly Rent'}
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-white font-display">
                        {formatCurrency(deal.amount, deal.property_currency)}
                        {!isBuy && <span className="text-xs font-normal text-slate-400">/mo</span>}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {isBuy ? `Financing: ${terms.financingType || 'Conventional'}` : `Lease: ${terms.leaseMonths || 12} Months`}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Terms Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider text-[10px]">
                      Detailed Transaction Parameters
                    </span>

                    {isBuy ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Earnest Money Deposit</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ${Number(terms.earnestMoney || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Target Closing Date</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {terms.closingDate || '30 Days'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Contingencies</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {Array.isArray(terms.contingencies) && terms.contingencies.length > 0
                              ? terms.contingencies.join(', ')
                              : 'Standard'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Move-in Date</span>
                          <span className="font-bold text-slate-900 dark:text-white">{terms.moveInDate || 'Immediate'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Household Occupants</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {terms.occupants?.adults || 1} Adults, {terms.occupants?.children || 0} Kids
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Monthly Income / Emp</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ${Number(terms.monthlyIncome || 0).toLocaleString()} ({terms.employmentStatus?.replace('_', ' ') || 'Employed'})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Pets & Parking</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {terms.hasPets ? `Pets: ${terms.petDetails}` : 'No pets'} • {terms.parkingSpaces || 0} spots
                          </span>
                        </div>
                      </div>
                    )}

                    {deal.customer_notes && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <span className="text-slate-400 font-medium">Applicant Note: </span>
                        <span className="italic text-slate-700 dark:text-slate-300">"{deal.customer_notes}"</span>
                      </div>
                    )}
                  </div>

                  {/* Counter Status Callout */}
                  {deal.status === 'COUNTERED' && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                      <span>Counter-Offer sent: {formatCurrency(deal.counter_amount, deal.property_currency)}</span>
                      <span className="font-bold">Awaiting applicant decision</span>
                    </div>
                  )}

                  {/* Accepted Callout */}
                  {deal.status === 'ACCEPTED' && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Deal Accepted! Property status updated to {isBuy ? 'SOLD' : 'RENTED'}.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Counter-Offer Modal */}
      {counterModalDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Propose Counter-Offer</h3>
              <button onClick={() => setCounterModalDeal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendCounter} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Counter Amount ({counterModalDeal.property_currency || 'USD'}) *
                </label>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Terms & Conditions Note to Buyer/Tenant
                </label>
                <textarea
                  rows="3"
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  placeholder="e.g. Willing to accept $X with earnest deposit increase to $Y or faster closing..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCounterModalDeal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submittingAction}>
                  {submittingAction ? 'Sending...' : 'Send Counter-Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Decline Offer</h3>
              <button onClick={() => setRejectModalDeal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectDeal} className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to decline this submission? You may provide a reason for the applicant below.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Reason for Declining (Optional)
                </label>
                <textarea
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Seller received higher competing cash offers..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectModalDeal(null)}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {submittingAction ? 'Processing...' : 'Decline Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
