import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  Home,
  Users,
  MessageSquare,
  Calendar,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flag,
  FileCheck,
  Activity,
  UserCheck,
  UserX,
  Building,
  KeyRound,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const data = await adminService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const pendingProperties = parseInt(analytics?.listings?.pending_properties || '0', 10);
  const pendingReports = parseInt(analytics?.reports?.pending_reports || '0', 10);
  const totalUsers = parseInt(analytics?.users?.total_users || '0', 10);
  const totalCustomers = parseInt(analytics?.users?.total_customers || '0', 10);
  const totalAgents = parseInt(analytics?.users?.total_agents || '0', 10);
  const totalProperties = parseInt(analytics?.listings?.total_properties || '0', 10);
  const approvedProperties = parseInt(analytics?.listings?.approved_properties || '0', 10);
  const soldProperties = parseInt(analytics?.listings?.sold_properties || '0', 10);
  const rentedProperties = parseInt(analytics?.listings?.rented_properties || '0', 10);
  const recentActivities = analytics?.recentActivity || [];

  return (
    <DashboardLayout
      title="Platform Governance & Control"
      subtitle="Super Admin overview of real-time database metrics, moderation, security audit, and users."
    >
      <div className="space-y-8">
        {/* Top Header Actions & Refresh */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500">Live Database Connected</span>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Priority Action Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Listings Alert */}
          {pendingProperties > 0 ? (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 text-white flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display">
                    {pendingProperties} Property Listing{pendingProperties > 1 ? 's' : ''} Awaiting Review
                  </h3>
                  <p className="text-xs text-amber-100">
                    Verify compliance, photos, and price before publishing.
                  </p>
                </div>
              </div>

              <Link to="/admin/moderation" className="shrink-0">
                <Button variant="secondary" size="sm" className="bg-white text-slate-900 hover:bg-slate-50 font-bold whitespace-nowrap">
                  Moderate
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-3.5 text-slate-600 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Moderation Queue Clear: </span>
                All property submissions have been reviewed and decided.
              </div>
            </div>
          )}

          {/* Pending Reports Alert */}
          {pendingReports > 0 ? (
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-3xl p-6 text-white flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shrink-0">
                  <Flag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display">
                    {pendingReports} Unresolved Report{pendingReports > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-rose-100">
                    User-submitted fraud or policy violation alerts require review.
                  </p>
                </div>
              </div>

              <Link to="/admin/reports" className="shrink-0">
                <Button variant="secondary" size="sm" className="bg-white text-slate-900 hover:bg-slate-50 font-bold whitespace-nowrap">
                  View Reports
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-3.5 text-slate-600 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Reports Zero Inbox: </span>
                No pending user grievance or listing fraud flags.
              </div>
            </div>
          )}
        </div>

        {/* Real Metrics Grid - 9 Core Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Live Database Metrics
            </h2>
            <span className="text-xs text-slate-400">Strictly computed from PostgreSQL tables</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Total Users */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Users
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {totalUsers}
                </div>
                <div className="text-xs text-slate-500">
                  All platform accounts registered
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Total Customers */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Customers
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {totalCustomers}
                </div>
                <div className="text-xs text-indigo-600 font-semibold">
                  Prospective buyers & tenants
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Total Agents */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Agents
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {totalAgents}
                </div>
                <div className="text-xs text-blue-600 font-semibold">
                  Licensed brokers & realtors
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Total Properties */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Properties
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {totalProperties}
                </div>
                <div className="text-xs text-slate-500">
                  All listings across all states
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
            </div>

            {/* 5. Approved Properties */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Approved & Live
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {approvedProperties}
                </div>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publicly visible & searchable</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
            </div>

            {/* 6. Pending Properties */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Properties
                </div>
                <div className="text-3xl font-black text-amber-600 font-display">
                  {pendingProperties}
                </div>
                <div className="text-xs text-amber-600 font-medium">
                  {pendingProperties > 0 ? 'Action required in queue' : 'No review backlog'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* 7. Sold Properties */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sold Properties
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {soldProperties}
                </div>
                <div className="text-xs text-slate-500">
                  Closed sale transactions
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* 8. Rented Properties */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rented Properties
                </div>
                <div className="text-3xl font-black text-slate-900 font-display">
                  {rentedProperties}
                </div>
                <div className="text-xs text-slate-500">
                  Executed lease contracts
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
            </div>

            {/* 9. Pending Reports */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Reports
                </div>
                <div className={`text-3xl font-black font-display ${pendingReports > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {pendingReports}
                </div>
                <div className={`text-xs ${pendingReports > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                  {pendingReports > 0 ? 'Unresolved violations flagged' : 'Platform integrity healthy'}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pendingReports > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
                <Flag className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Audit Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 font-display">Recent Activity & Audit Log</h3>
                <p className="text-xs text-slate-500">Chronological ledger of moderation decisions and account governance.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {recentActivities.length} Recent Events
            </span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No administrative audit entries logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-6">Action</th>
                    <th className="py-3 px-6">Entity</th>
                    <th className="py-3 px-6">Admin Actor</th>
                    <th className="py-3 px-6">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {recentActivities.map((log) => {
                    const isApprove = log.action?.includes('APPROVE');
                    const isReject = log.action?.includes('REJECT');
                    const isStatus = log.action?.includes('STATUS');
                    const isUser = log.action?.includes('USER');
                    const isReport = log.action?.includes('REPORT');

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3.5 px-6 font-semibold whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isApprove
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isReject
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isReport
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : isUser
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-600 uppercase text-[11px]">
                          {log.entity_type} #{log.entity_id ? log.entity_id.slice(0, 8) : ''}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-slate-800">
                            {log.first_name ? `${log.first_name} ${log.last_name || ''}` : 'System Admin'}
                          </div>
                          <div className="text-[10px] text-slate-400">{log.email}</div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                          {log.ip_address || '::1'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Navigation Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            to="/admin/moderation"
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 font-display">Approval Queue</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review property submissions from agents with feedback notes.
            </p>
            <div className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform">
              <span>Open queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/properties"
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 font-display">Property Inventory</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Search, filter, view rejection reasons, or manage inappropriate listings.
            </p>
            <div className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform">
              <span>Manage listings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 font-display">User Governance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Manage customer/agent accounts, suspend users, and verify agent licenses.
            </p>
            <div className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform">
              <span>Manage users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Flag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 font-display">Reports & Moderation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review flagged content, resolve grievances, and take direct action on listings.
            </p>
            <div className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform">
              <span>Review reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
