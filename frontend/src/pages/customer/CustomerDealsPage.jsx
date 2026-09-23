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
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function CustomerDealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dealTypeFilter, setDealTypeFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { addToast } = useToast();

  const loadDeals = async () => {
    try {
      setLoading(true);
      const data = await dealService.getCustomerDeals({
        dealType: dealTypeFilter || undefined
      });
      setDeals(data);
    } catch (err) {
      console.error('Failed to load customer deals:', err);
      addToast('Failed to load offers and applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, [dealTypeFilter]);

  const handleAcceptCounter = async (dealId) => {
    if (!window.confirm('Accept the agent counter-offer and proceed to contract escrow?')) return;
    setActionLoadingId(dealId);
    try {
      await dealService.updateDealStatus(dealId, { status: 'ACCEPTED' });
      addToast('Counter-offer accepted! The listing is now under contract.', 'success');
      loadDeals();
    } catch (err) {
      addToast(err.message || 'Failed to accept counter-offer', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to withdraw this offer/application?')) return;
    setActionLoadingId(dealId);
    try {
      await dealService.updateDealStatus(dealId, {
        status: 'CANCELLED',
        customerNotes: 'Withdrawn by applicant'
      });
      addToast('Offer withdrawn.', 'info');
      loadDeals();
    } catch (err) {
      addToast(err.message || 'Failed to withdraw offer', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="emerald">Accepted</Badge>;
      case 'COUNTERED':
        return <Badge variant="amber">Counter-Offer Received</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Declined</Badge>;
      case 'CANCELLED':
        return <Badge variant="default">Withdrawn</Badge>;
      default:
        return <Badge variant="primary">Pending Review</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="My Offers & Lease Applications"
      subtitle="Track purchase offers, rental applications, counter-proposals, and deal closures."
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: '', label: 'All Transactions' },
              { id: 'BUY_OFFER', label: 'Buy Offers' },
              { id: 'RENT_APPLICATION', label: 'Rental Applications' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDealTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dealTypeFilter === tab.id
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link to="/properties">
            <Button variant="outline" size="sm">
              Explore More Listings →
            </Button>
          </Link>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <Handshake className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No offers or applications yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              When you submit a purchase offer on a property for sale or apply for a rental, your submission will appear here.
            </p>
            <Link to="/properties">
              <Button variant="primary" size="sm">Browse Available Properties</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => {
              const isBuy = deal.deal_type === 'BUY_OFFER';
              const terms = typeof deal.terms === 'string' ? JSON.parse(deal.terms || '{}') : deal.terms || {};

              return (
                <div
                  key={deal.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all"
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
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isBuy ? 'Purchase Offer' : 'Rental Lease Application'}
                          </span>
                          {getStatusBadge(deal.status)}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Submitted on {formatDate(deal.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/portal/chat?recipientId=${deal.agent_id}&propertyId=${deal.property_id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span>Chat Agent</span>
                      </Link>

                      {deal.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelDeal(deal.id)}
                          disabled={actionLoadingId === deal.id}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Property & Financial Terms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Property info */}
                    <div className="flex items-center gap-3">
                      <img
                        src={deal.property_image_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=200&q=80'}
                        alt=""
                        className="w-16 h-14 rounded-2xl object-cover shrink-0 shadow-xs"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/properties/${deal.property_slug || deal.property_id}`}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                        >
                          {deal.property_title}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate">{deal.property_city}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Asking: {formatCurrency(deal.property_listing_price, deal.property_currency)}
                        </div>
                      </div>
                    </div>

                    {/* Financial Offer */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isBuy ? 'Offered Purchase Price' : 'Offered Monthly Rent'}
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-white font-display">
                        {formatCurrency(deal.amount, deal.property_currency)}
                        {!isBuy && <span className="text-xs font-normal text-slate-400">/mo</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isBuy ? `Financing: ${terms.financingType || 'Conventional'}` : `Lease: ${terms.leaseMonths || 12} Months`}
                      </div>
                    </div>

                    {/* Terms details */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 text-[11px]">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Submitted Terms</span>
                      {isBuy ? (
                        <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                          <div>Deposit: ${Number(terms.earnestMoney || 0).toLocaleString()}</div>
                          <div>Target Closing: {terms.closingDate || 'Standard 30 Days'}</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                          <div>Move-in: {terms.moveInDate || 'Immediate'}</div>
                          <div>Occupants: {terms.occupants?.adults || 1} Adults, {terms.occupants?.children || 0} Kids</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Counter-Offer Notification Callout */}
                  {deal.status === 'COUNTERED' && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Agent Counter-Offer: {formatCurrency(deal.counter_amount, deal.property_currency)}
                          </span>
                        </div>
                        {deal.agent_notes && (
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 italic pl-6">
                            "{deal.agent_notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                        <button
                          onClick={() => handleAcceptCounter(deal.id)}
                          disabled={actionLoadingId === deal.id}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Accept Counter-Offer
                        </button>
                        <button
                          onClick={() => handleCancelDeal(deal.id)}
                          disabled={actionLoadingId === deal.id}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Accepted Celebration Callout */}
                  {deal.status === 'ACCEPTED' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            Congratulations! Your {isBuy ? 'Purchase Offer' : 'Rental Lease Application'} has been officially accepted.
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                            The listing is now under contract. Connect with agent {deal.agent_first_name} {deal.agent_last_name} to complete escrow and keys handover.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
