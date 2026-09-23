import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Check,
  Clock
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load unread count
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // Quiet fail on network poll
    }
  };

  // Load notification list
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationService.getNotifications(1, 10);
      setNotifications(res.notifications || []);
      if (typeof res.meta?.unreadCount === 'number') {
        setUnreadCount(res.meta.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await notificationService.markAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
      setIsOpen(false);
      if (notif.link_url) {
        navigate(notif.link_url);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PROPERTY_APPROVED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'PROPERTY_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'INQUIRY_RECEIVED':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'APPOINTMENT_REQUESTED':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'APPOINTMENT_CONFIRMED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'APPOINTMENT_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'APPOINTMENT_CANCELLED':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-display">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">You have no notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notif.is_read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!notif.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(notif.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
