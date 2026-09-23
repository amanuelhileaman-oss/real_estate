import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { inquiryService } from '../../services/inquiryService';
import { formatDate } from '../../utils/formatters';
import { MessageSquare, Mail, Phone, ExternalLink, User } from 'lucide-react';

export default function CustomerInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const res = await inquiryService.getMyInquiries();
      setInquiries(res.inquiries || []);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  return (
    <DashboardLayout
      title="My Property Inquiries"
      subtitle="Messages and inquiries you've sent directly to listing agents."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Inquiries Sent Yet</h3>
            <p className="text-xs text-slate-500 mb-6">
              When you have questions about a home, click "Contact Agent" on any property page.
            </p>
            <Link to="/properties">
              <Button variant="primary">Browse Listings</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        inq.status === 'CONTACTED'
                          ? 'emerald'
                          : inq.status === 'CLOSED'
                          ? 'default'
                          : 'primary'
                      }
                    >
                      {inq.status === 'NEW'
                        ? 'Sent - Awaiting Agent'
                        : inq.status === 'CONTACTED'
                        ? 'Agent Responded'
                        : 'Resolved'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Sent on {formatDate(inq.created_at)}
                    </span>
                  </div>

                  <Link
                    to={`/properties/${inq.property_slug || inq.property_id}`}
                    className="block text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors font-display"
                  >
                    {inq.property_title}
                  </Link>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 italic">
                    "{inq.message}"
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Listing Agent: {inq.agent_first_name} {inq.agent_last_name}</span>
                    </div>
                    {inq.agent_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`mailto:${inq.agent_email}`} className="text-blue-600 hover:underline">
                          {inq.agent_email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  <Link to={`/properties/${inq.property_slug || inq.property_id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Home
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
