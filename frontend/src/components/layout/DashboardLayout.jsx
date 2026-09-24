import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../common/NotificationDropdown';
import ThemeSelector from '../common/ThemeSelector';
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Home,
  PlusCircle,
  MessageSquare,
  Calendar,
  Heart,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  UserCircle,
  Flag,
  Bell,
  Handshake
} from 'lucide-react';

export default function DashboardLayout({ children, title, subtitle }) {
  const { user, isAdmin, isAgent, isCustomer, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Navigation configurations based on role
  let navItems = [];

  if (isAdmin) {
    navItems = [
      { label: 'Platform Analytics', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Approval Queue', path: '/admin/moderation', icon: ShieldCheck },
      { label: 'All Platform Listings', path: '/admin/properties', icon: Home },
      { label: 'User Governance', path: '/admin/users', icon: Users },
      { label: 'Reports & Moderation', path: '/admin/reports', icon: Flag },
      { label: 'Chat Support Desk', path: '/admin/chat', icon: MessageSquare }
    ];
  } else if (isAgent) {
    navItems = [
      { label: 'Agent Dashboard', path: '/portal/agent/dashboard', icon: LayoutDashboard },
      { label: 'My Listings', path: '/portal/agent/properties', icon: Home },
      { label: '+ Add New Listing', path: '/portal/agent/properties/new', icon: PlusCircle, highlight: true },
      { label: 'Offers & Applications', path: '/portal/agent/deals', icon: Handshake },
      { label: 'Live Chat Messenger', path: '/portal/agent/chat', icon: MessageSquare },
      { label: 'Inquiries & Leads', path: '/portal/agent/inquiries', icon: Users },
      { label: 'Viewing Calendar', path: '/portal/agent/appointments', icon: Calendar },
      { label: 'Advisor Profile', path: '/portal/agent/profile', icon: UserCircle }
    ];
  } else if (isCustomer) {
    navItems = [
      { label: 'My Overview', path: '/portal/customer/overview', icon: LayoutDashboard },
      { label: 'Offers & Applications', path: '/portal/customer/deals', icon: Handshake },
      { label: 'Live Chat Messenger', path: '/portal/customer/chat', icon: MessageSquare },
      { label: 'Saved Favorites', path: '/portal/customer/favorites', icon: Heart },
      { label: 'My Inquiries', path: '/portal/customer/inquiries', icon: Users },
      { label: 'Scheduled Viewings', path: '/portal/customer/appointments', icon: Calendar },
      { label: 'Notifications', path: '/portal/customer/notifications', icon: Bell },
      { label: 'My Profile', path: '/portal/customer/profile', icon: UserCircle }
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-white font-display">ApexRealty</span>
                <span className="block text-[10px] font-semibold text-blue-400 uppercase tracking-widest -mt-1">
                  {user?.role} PORTAL
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25'
                      : item.highlight
                      ? 'bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border border-blue-800/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              External
            </div>
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Public Marketplace
            </Link>
          </nav>

          {/* User footer profile */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.first_name?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20 transition-colors">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/properties" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline hidden sm:inline">
                View Public Site →
              </Link>
              <ThemeSelector />
              <NotificationDropdown />
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
