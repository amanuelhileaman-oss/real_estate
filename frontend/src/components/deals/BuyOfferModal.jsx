import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dealService } from '../../services/dealService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';
import { X, DollarSign, Calendar, ShieldCheck, CheckSquare, Sparkles } from 'lucide-react';

export default function BuyOfferModal({ property, isOpen, onClose, onSuccess }) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [amount, setAmount] = useState(property?.price || '');
  const [financingType, setFinancingType] = useState('CONVENTIONAL');
  const [earnestMoney, setEarnestMoney] = useState(property?.price ? Math.round(property.price * 0.03) : 5000);
  const [closingDate, setClosingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [contingencies, setContingencies] = useState(['INSPECTION', 'APPRAISAL', 'FINANCING']);
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !property) return null;

  const toggleContingency = (c) => {
    setContingencies((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please log in as a customer to submit a purchase offer.', 'warning');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast('Please enter a valid offer price.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await dealService.createDeal({
        propertyId: property.id,
        dealType: 'BUY_OFFER',
        amount: numAmount,
        terms: {
          financingType,
          earnestMoney: parseFloat(earnestMoney) || 0,
          closingDate,
          contingencies
        },
        customerNotes
      });

      addToast('Purchase offer submitted directly to the listing agent!', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit buy offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                For Sale Offer
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Make an Offer to Buy</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
              {property.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Listing Price Context */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Current Asking Price:</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {formatCurrency(property.price, property.currency)}
            </span>
          </div>

          {/* Offer Amount */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Your Offer Amount ({property.currency || 'USD'}) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1000"
                step="500"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Financing Type */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Financing Arrangement *
            </label>
            <select
              value={financingType}
              onChange={(e) => setFinancingType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASH">All Cash (No Financing Contingency)</option>
              <option value="CONVENTIONAL">Conventional Mortgage Loan</option>
              <option value="FHA_VA">FHA / VA Government Backed Loan</option>
              <option value="CONTINGENT">Contingent on Selling Current Home</option>
            </select>
          </div>

          {/* Earnest Money & Closing Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Earnest Money Deposit ($)
              </label>
              <input
                type="number"
                value={earnestMoney}
                onChange={(e) => setEarnestMoney(e.target.value)}
                min="0"
                step="100"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Target Closing Date
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Standard Contingencies */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Offer Contingencies
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'INSPECTION', label: 'Satisfactory Home Inspection (7-10 days)' },
                { id: 'APPRAISAL', label: 'Property Appraisal at or above offer price' },
                { id: 'FINANCING', label: 'Mortgage Loan Underwriting Approval' },
                { id: 'TITLE', label: 'Clear & Marketable Title Verification' }
              ].map((c) => {
                const checked = contingencies.includes(c.id);
                return (
                  <label
                    key={c.id}
                    onClick={() => toggleContingency(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-pointer ${
                      checked
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Customer remarks */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Personal Remarks to Listing Agent (Optional)
            </label>
            <textarea
              rows="3"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. We love this home and have mortgage pre-approval in hand ready for a fast closing..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Submitting Offer...' : 'Submit Formal Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
