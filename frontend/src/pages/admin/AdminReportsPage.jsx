import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  Flag,
  ShieldAlert,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  X,
  Loader2,
  Settings2,
  Home
} from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: 'All Reports' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' }
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const { addToast } = useToast();

  // Resolution Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('RESOLVED'); // 'RESOLVED' or 'DISMISSED' or 'INVESTIGATING'
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Property Takedown / Status Modal
  const [takedownReport, setTakedownReport] = useState(null);
  const [takedownStatus, setTakedownStatus] = useState('ARCHIVED');
  const [takedownReason, setTakedownReason] = useState('Violates platform guidelines; verified user complaint.');
  const [takingDown, setTakingDown] = useState(false);

  const loadReports = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getReports({
        page,
        status: statusFilter || null
      });
      setReports(res.reports || []);
      setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load reports:', err);
      addToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1);
  }, [statusFilter]);

  const handleOpenResolution = (report, action) => {
    setSelectedReport(report);
    setResolutionAction(action);
    setAdminNotes(report.admin_notes || '');
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      setUpdating(true);
      await adminService.updateReport(selectedReport.id, resolutionAction, adminNotes.trim() || null);
      addToast(`Report marked as ${resolutionAction.toLowerCase()}`, 'success');
      setSelectedReport(null);
      loadReports(meta.page);
    } catch (err) {
      addToast(err.message || 'Failed to update report', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenTakedown = (report) => {
    setTakedownReport(report);
    setTakedownStatus('ARCHIVED');
    setTakedownReason(`Taken down following report #${report.id.slice(0, 8)}: ${report.report_type}`);
  };

  const handleSubmitTakedown = async (e) => {
    e.preventDefault();
    if (!takedownReport) return;

    try {
      setTakingDown(true);
      await adminService.changePropertyStatus(takedownReport.property_id, takedownStatus, takedownReason);
      await adminService.updateReport(takedownReport.id, 'RESOLVED', `Listing status set to ${takedownStatus}. Reason: ${takedownReason}`);
      addToast(`Property ${takedownStatus === 'ARCHIVED' ? 'taken down and archived' : 'status updated'}. Report resolved.`, 'success');
      setTakedownReport(null);
      loadReports(meta.page);
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setTakingDown(false);
    }
  };

  return (
    <DashboardLayout
      title="Platform Reports & Trust Moderation"
      subtitle="Investigate user grievances, fraud claims, and inappropriate content. Take decisive enforcement actions."
    >
      <div className="space-y-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm max-w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reports Content */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No reports found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter ? `There are no ${statusFilter.toLowerCase()} reports at this time.` : 'Platform content reports queue is clear.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const isPending = report.status === 'PENDING';
              const isInvestigating = report.status === 'INVESTIGATING';
              const isResolved = report.status === 'RESOLVED';
              const isDismissed = report.status === 'DISMISSED';

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isPending
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : isInvestigating
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : isResolved
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Flag className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {report.report_type.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : isInvestigating
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isResolved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {report.status}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Report #{report.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Reported on {formatDate(report.created_at)}</span>
                          <span>•</span>
                          <span>
                            By: {report.reporter_email || <span className="italic">Anonymous User</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {isPending && (
                        <button
                          onClick={() => handleOpenResolution(report, 'INVESTIGATING')}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200"
                        >
                          Investigate
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          onClick={() => handleOpenResolution(report, 'RESOLVED')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-sm"
                        >
                          Resolve
                        </button>
                      )}

                      {!isDismissed && (
                        <button
                          onClick={() => handleOpenResolution(report, 'DISMISSED')}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Target Property Callout Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">
                          {report.property_title || 'Listing Details'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Property ID: {report.property_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        to={`/properties/${report.property_slug || report.property_id}`}
                        target="_blank"
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Inspect Listing</span>
                      </Link>

                      <button
                        onClick={() => handleOpenTakedown(report)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1.5"
                        title="Take down or archive listing"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Enforce / Take Down</span>
                      </button>
                    </div>
                  </div>

                  {/* User Complaint Message */}
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Reporter Narrative / Evidence
                    </span>
                    <p className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/50 text-slate-800 leading-relaxed italic">
                      "{report.reason}"
                    </p>
                  </div>

                  {/* Admin Notes if present */}
                  {report.admin_notes && (
                    <div className="text-xs space-y-1 pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        Moderator Resolution Notes
                      </span>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {report.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                hasNextPage={meta.hasNextPage}
                hasPrevPage={meta.hasPrevPage}
                onPageChange={(p) => loadReports(p)}
              />
            </div>
          </div>
        )}

        {/* Resolution Notes Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Update Report to {resolutionAction}</span>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitResolution} className="p-6 space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Target Report</div>
                  <div className="text-xs font-bold text-slate-800">
                    #{selectedReport.id.slice(0, 8)} - {selectedReport.report_type}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 italic">
                    "{selectedReport.reason}"
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Resolution Status
                  </label>
                  <select
                    value={resolutionAction}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Moderator Notes (Audit Logged)
                  </label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter audit notes regarding how this report was handled or dismissed..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    disabled={updating}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Decision</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Takedown / Status Action Modal */}
        {takedownReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/50">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Enforce Listing Moderation Action</span>
                </div>
                <button
                  onClick={() => setTakedownReport(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTakedown} className="p-6 space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Target Property</div>
                  <div className="text-sm font-bold text-slate-900">{takedownReport.property_title}</div>
                  <div className="text-xs text-slate-400">ID: {takedownReport.property_id}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Action to take
                  </label>
                  <select
                    value={takedownStatus}
                    onChange={(e) => setTakedownStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ARCHIVED">Archive / Take Down Immediately (Remove from public)</option>
                    <option value="REJECTED">Reject / Send back to Agent for Revision</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Enforcement Reason
                  </label>
                  <textarea
                    rows={3}
                    value={takedownReason}
                    onChange={(e) => setTakedownReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                  Submitting will update the listing status, notify the agent, and mark this report as RESOLVED.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTakedownReport(null)}
                    disabled={takingDown}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={takingDown}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    {takingDown && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Apply Enforcement</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
