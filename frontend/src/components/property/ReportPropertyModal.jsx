import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { propertyService } from '../../services/propertyService';

const REPORT_TYPES = [
  { value: 'FRAUD_SCAM', label: 'Potential Scam or Fraudulent Listing' },
  { value: 'INACCURATE_INFORMATION', label: 'Inaccurate or Misleading Information' },
  { value: 'OFFENSIVE_CONTENT', label: 'Offensive or Inappropriate Content' },
  { value: 'UNAVAILABLE_LISTING', label: 'Property is No Longer Available' },
  { value: 'DUPLICATE_LISTING', label: 'Duplicate Listing' },
  { value: 'OTHER', label: 'Other Terms of Service Violation' },
];

export default function ReportPropertyModal({ isOpen, onClose, property, onSuccess }) {
  const [reportType, setReportType] = useState('FRAUD_SCAM');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Please provide a specific description of at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await propertyService.reportProperty(property.id, reportType, reason.trim());
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setError('');
    setSuccess(false);
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Report Listing</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{property.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">Report Submitted</h4>
              <p className="text-sm text-slate-400">
                Our moderation and trust team has been notified and will review this listing promptly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason for Reporting
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Details / Explanation
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe why this listing violates guidelines or is misleading (minimum 10 characters)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl transition flex items-center gap-2 shadow-lg shadow-rose-900/30"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
