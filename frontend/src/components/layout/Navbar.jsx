import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import NotificationDropdown from '../common/NotificationDropdown';
import ThemeSelector from '../common/ThemeSelector';
import {
  Building2,
  Heart,
  Calendar,
  PlusCircle,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  Users,
  MessageSquare
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isAgent, isCustomer, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
              Apex<span className="text-blue-600 dark:text-blue-400">Realty</span>
            </span>
            <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest -mt-1">
              Prime Living
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/properties"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive('/properties')
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Explore Properties
          </Link>
          <Link
            to="/properties?view=map"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Interactive Map
          </Link>
          <Link
            to="/agents"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/agents')
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Agents
          </Link>
          <Link
            to="/customers"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/customers')
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Customers
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Selector Dropdown */}
          <ThemeSelector />

          {/* Quick Chat Messenger Link (Authenticated) */}
          {isAuthenticated && (
            <Link
              to="/portal/chat"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors relative"
              title="Live Chat Messenger"
            >
              <MessageSquare className="w-5 h-5" />
            </Link>
          )}

          {/* If Customer: Quick Favorites link */}
          {isCustomer && (
            <Link
              to="/portal/customer/favorites"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors relative"
              title="Saved Favorites"
            >
              <Heart className="w-5 h-5" />
            </Link>
          )}

          {/* If Agent: List Property CTA */}
          {isAgent && (
            <Link to="/portal/agent/properties/new">
              <Button size="sm" variant="primary" className="shadow-blue-500/20">
                <PlusCircle className="w-4 h-4" />
                List Property
              </Button>
            </Link>
          )}

          {/* If Admin: Quick Link to Moderation */}
          {isAdmin && (
            <Link to="/admin/moderation">
              <Button size="sm" variant="secondary">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Moderation Queue
              </Button>
            </Link>
          )}

          {/* In-App Notifications */}
          {isAuthenticated && <NotificationDropdown />}

          {/* User Profile / Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{user.first_name}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user.role}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.first_name?.[0] || 'U'}
                </div>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.email}</p>
                  </div>

                  <Link to="/portal/chat" className="block px-4 py-2 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40">
                    💬 Live Chat Messenger
                  </Link>

                  {isAdmin && (
                    <>
                      <Link to="/admin/dashboard" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Admin Dashboard
                      </Link>
                      <Link to="/admin/moderation" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Moderation Queue
                      </Link>
                      <Link to="/admin/properties" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        All Platform Listings
                      </Link>
                      <Link to="/admin/users" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        User Management
                      </Link>
                    </>
                  )}

                  {isAgent && (
                    <>
                      <Link to="/portal/agent/dashboard" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Agent Dashboard
                      </Link>
                      <Link to="/portal/agent/properties" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        My Listings
                      </Link>
                      <Link to="/portal/agent/deals" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Offers & Applications
                      </Link>
                      <Link to="/portal/agent/inquiries" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Inquiries & Leads
                      </Link>
                      <Link to="/portal/agent/appointments" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Viewing Appointments
                      </Link>
                    </>
                  )}

                  {isCustomer && (
                    <>
                      <Link to="/portal/customer/overview" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        My Dashboard
                      </Link>
                      <Link to="/portal/customer/deals" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        My Offers & Applications
                      </Link>
                      <Link to="/portal/customer/favorites" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        Saved Favorites
                      </Link>
                      <Link to="/portal/customer/appointments" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        My Viewings
                      </Link>
                    </>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSelector />
          {isAuthenticated && <NotificationDropdown />}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/properties"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore Properties
          </Link>
          <Link
            to="/properties?view=map"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Interactive Map
          </Link>
          <Link
            to="/agents"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Agents Directory
          </Link>
          <Link
            to="/customers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Customers Directory
          </Link>

          {isAuthenticated ? (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="text-xs font-semibold text-slate-400 px-3">
                Logged in as {user.first_name} ({user.role})
              </div>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-800 font-medium"
                >
                  Admin Portal
                </Link>
              )}
              {isAgent && (
                <Link
                  to="/portal/agent/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-800 font-medium"
                >
                  Agent Portal
                </Link>
              )}
              {isCustomer && (
                <Link
                  to="/portal/customer/overview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-800 font-medium"
                >
                  Customer Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm text-rose-600 font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
