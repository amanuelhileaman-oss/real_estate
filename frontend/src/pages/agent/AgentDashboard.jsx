import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { inquiryService } from '../../services/inquiryService';
import { appointmentService } from '../../services/appointmentService';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { formatDate, formatCurrency } from '../../utils/formatters';
import {
  Home,
  PlusCircle,
  MessageSquare,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgentData() {
      try {
        setLoading(true);
        const [listingsRes, inqRes, aptRes] = await Promise.all([
          apiRequest('/agents/my-listings?limit=10'),
          inquiryService.getAgentInquiries(null, 1, 5),
          appointmentService.getAgentAppointments()
        ]);
        setListings(listingsRes.data || []);
        setInquiries(inqRes.inquiries || []);
        setAppointments(aptRes || []);
      } catch (err) {
        console.error('Error loading agent dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgentData();
  }, []);

  const activeCount = listings.filter((l) => l.status_code === 'ACTIVE').length;
  const pendingCount = listings.filter((l) => l.status_code === 'PENDING_APPROVAL').length;

  return (
    <DashboardLayout
      title={`Agent Workspace: ${user?.first_name} ${user?.last_name}`}
      subtitle={`${user?.agency_name || 'Premier Realty'} • License: ${user?.license_number || 'Verified'}`}
    >
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Listings</div>
              <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">{listings.length}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">{activeCount} active live</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Review</div>
              <div className="text-2xl font-extrabold text-amber-600 font-display mt-1">{pendingCount}</div>
              <div className="text-[11px] text-slate-400">Admin moderation queue</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Inquiries</div>
              <div className="text-2xl font-extrabold text-indigo-600 font-display mt-1">{inquiries.length}</div>
              <div className="text-[11px] text-slate-400">Prospective buyer leads</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Viewing Tours</div>
              <div className="text-2xl font-extrabold text-emerald-600 font-display mt-1">{appointments.length}</div>
              <div className="text-[11px] text-slate-400">Confirmed & requested</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <h2 className="text-xl font-bold font-display">Ready to list a new property?</h2>
            <p className="text-xs text-blue-200 mt-1">
              Add property specs, pin exact location with the interactive PostGIS map, and upload high-res gallery photos.
            </p>
          </div>
          <Link to="/portal/agent/properties/new" className="shrink-0">
            <Button variant="primary" size="md" className="bg-white text-blue-900 hover:bg-blue-50">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Create New Listing</span>
            </Button>
          </Link>
        </div>

        {/* Dual Section: Recent Leads and Viewing Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leads / Inquiries */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">Recent Client Inquiries</h3>
              <Link to="/portal/agent/inquiries" className="text-xs font-semibold text-blue-600 hover:underline">
                View All Inbox →
              </Link>
            </div>

            {inquiries.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No inquiries received yet.</p>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900">{inq.name}</div>
                      <Badge variant={inq.status === 'NEW' ? 'primary' : 'default'}>{inq.status}</Badge>
                    </div>
                    <div className="text-xs text-blue-700 font-medium truncate">
                      Re: {inq.property_title}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 italic">
                      "{inq.message}"
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>{inq.email} • {inq.phone || 'No phone'}</span>
                      <span>{formatDate(inq.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Viewing Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">Tour Appointments</h3>
              <Link to="/portal/agent/appointments" className="text-xs font-semibold text-blue-600 hover:underline">
                Calendar View →
              </Link>
            </div>

            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No viewing tours requested yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-slate-900">{apt.property_title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{formatDate(apt.requested_date)}</span>
                        <span>•</span>
                        <span>{apt.time_slot}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Client: {apt.customer_first_name} {apt.customer_last_name} ({apt.customer_phone || apt.customer_email})
                      </div>
                    </div>
                    <Badge variant={apt.status === 'CONFIRMED' ? 'emerald' : 'amber'}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
