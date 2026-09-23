import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dealService } from '../../services/dealService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';
import { X, DollarSign, Calendar, Users, PawPrint, Car, FileCheck } from 'lucide-react';

export default function RentalApplicationModal({ property, isOpen, onClose, onSuccess }) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [monthlyRent, setMonthlyRent] = useState(property?.price || '');
  const [leaseMonths, setLeaseMonths] = useState(12);
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('EMPLOYED_FULL_TIME');
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState(property?.parking_spaces ? 1 : 0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please log in as a customer to submit a rental application.', 'warning');
      return;
    }

    const numRent = parseFloat(monthlyRent);
    if (isNaN(numRent) || numRent <= 0) {
      addToast('Please enter a valid monthly rent offer.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await dealService.createDeal({
        propertyId: property.id,
        dealType: 'RENT_APPLICATION',
        amount: numRent,
        terms: {
          leaseMonths: parseInt(leaseMonths, 10),
          moveInDate,
          occupants: {
            adults: parseInt(adults, 10),
            children: parseInt(children, 10)
          },
          monthlyIncome: parseFloat(monthlyIncome) || 0,
          employmentStatus,
          hasPets,
          petDetails: hasPets ? petDetails : 'None',
          parkingSpaces: parseInt(parkingSpaces, 10)
        },
        customerNotes
      });

      addToast('Rental application successfully submitted to listing agent!', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit rental application', 'error');
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
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                Lease Application
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Apply to Rent / Lease</h3>
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
          {/* Listing context */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Published Monthly Rent:</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {formatCurrency(property.price, property.currency)}/month
            </span>
          </div>

          {/* Monthly Rent & Lease Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Offered Monthly Rent ($) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  required
                  min="100"
                  step="25"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Lease Term Duration *
              </label>
              <select
                value={leaseMonths}
                onChange={(e) => setLeaseMonths(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value={6}>6 Months (Short Term)</option>
                <option value={12}>12 Months (Standard)</option>
                <option value={18}>18 Months</option>
                <option value={24}>24 Months (Long Term)</option>
              </select>
            </div>
          </div>

          {/* Preferred Move-in Date & Occupants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Target Move-In Date *
              </label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Adults</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Children</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={children}
                  onChange={(e) => setChildren(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Income & Employment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Monthly Gross Income ($)
              </label>
              <input
                type="number"
                placeholder="e.g. 6500"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                min="0"
                step="100"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Employment Status
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="EMPLOYED_FULL_TIME">Employed Full-Time</option>
                <option value="SELF_EMPLOYED">Self-Employed / Business</option>
                <option value="RETIRED">Retired / Pension</option>
                <option value="STUDENT">Student with Guarantor</option>
              </select>
            </div>
          </div>

          {/* Pets & Parking */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={hasPets}
                  onChange={(e) => setHasPets(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <PawPrint className="w-3.5 h-3.5 text-amber-500" />
                <span>Moving with pets?</span>
              </label>
              <div className="flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-500">Parking spaces:</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={parkingSpaces}
                  onChange={(e) => setParkingSpaces(e.target.value)}
                  className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center"
                />
              </div>
            </div>

            {hasPets && (
              <div>
                <input
                  type="text"
                  placeholder="Pet breed, weight, age (e.g. 1 golden retriever 25kg)"
                  value={petDetails}
                  onChange={(e) => setPetDetails(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Tenant remarks */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Personal Remarks / Tenant Background (Optional)
            </label>
            <textarea
              rows="3"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Non-smoker, clean rental history with references available upon request..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Submitting Application...' : 'Submit Rental Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
