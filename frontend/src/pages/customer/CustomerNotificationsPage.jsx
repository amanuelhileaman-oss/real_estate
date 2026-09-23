import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  Bell,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Home,
  Check,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Inbox
} from 'lucide-react';

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const { addToast } = useToast();

  const loadNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const isRead = unreadOnly ? false : undefined;
      const res = await notificationService.getNotifications(page, 15, isRead);
      setNotifications(res.notifications || []);
      setMeta(res.meta || { page, totalPages: 1, total: res.notifications?.length || 0 });

      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      addToast(err.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1);
  }, [unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      addToast('Marked as read', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      addToast('Notification dismissed', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT_REQUESTED':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_REJECTED':
      case 'APPOINTMENT_CANCELLED':
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'INQUIRY_RECEIVED':
      case 'INQUIRY_STATUS_CHANGED':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'PROPERTY_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'PROPERTY_REJECTED':
        return <Home className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <DashboardLayout
      title="Notifications & Updates"
      subtitle="Track viewing tour confirmations, agent inquiry responses, and listing alerts in real time."
    >
      <div className="space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-sm max-w-fit">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !unreadOnly ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                unreadOnly ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-black rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto space-y-3 my-8">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">No Notifications</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {unreadOnly
                ? 'You are all caught up! There are no unread notifications.'
                : 'When agents reply to your inquiries or confirm property viewing tours, notifications will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 bg-white rounded-2xl border transition-all duration-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !n.is_read
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {n.link_url && (
                    <Link
                      to={n.link_url}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {meta.totalPages > 1 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  hasNextPage={meta.hasNextPage}
                  hasPrevPage={meta.hasPrevPage}
                  onPageChange={(p) => loadNotifications(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
