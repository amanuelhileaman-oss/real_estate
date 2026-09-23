import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { inquiryService } from '../../services/inquiryService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import { MessageSquare, Mail, Phone, Calendar, User } from 'lucide-react';

export default function AgentInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const res = await inquiryService.getAgentInquiries(statusFilter || null);
      setInquiries(res.inquiries || []);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, [statusFilter]);

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      await inquiryService.updateStatus(inquiryId, newStatus);
      addToast(`Inquiry status updated to ${newStatus}`, 'success');
      loadInquiries();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout
      title="Client Inquiries & Leads"
      subtitle="Direct messages sent by interested buyers and prospective tenants."
    >
      <div className="space-y-6">
        {/* Status Tabs */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 w-fit">
          {['', 'NEW', 'CONTACTED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st || 'All Messages'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Inbox Empty</h3>
            <p className="text-xs text-slate-500">No client messages matching this filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        inq.status === 'NEW'
                          ? 'primary'
                          : inq.status === 'CONTACTED'
                          ? 'emerald'
                          : 'default'
                      }
                    >
                      {inq.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Received {formatDate(inq.created_at)}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-blue-600">
                    Property: {inq.property_title}
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-normal bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                    "{inq.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inq.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${inq.email}`} className="hover:underline text-blue-600">
                        {inq.email}
                      </a>
                    </div>
                    {inq.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`tel:${inq.phone}`} className="hover:underline">
                          {inq.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="shrink-0 flex sm:flex-col gap-2">
                  {inq.status !== 'CONTACTED' && (
                    <button
                      onClick={() => handleStatusChange(inq.id, 'CONTACTED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-colors"
                    >
                      Mark Contacted
                    </button>
                  )}
                  {inq.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleStatusChange(inq.id, 'CLOSED')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Close Inquiry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
