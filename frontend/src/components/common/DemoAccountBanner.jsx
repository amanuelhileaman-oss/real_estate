import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, UserCheck, Briefcase, LogOut, KeyRound } from 'lucide-react';

export default function DemoAccountBanner() {
  const { user, switchDemoAccount, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitch = async (role) => {
    try {
      await switchDemoAccount(role);
      addToast(`Switched account to ${role}`, 'success');
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'AGENT') {
        navigate('/portal/agent/dashboard');
      } else if (role === 'CUSTOMER') {
        if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/portal/agent')) {
          navigate('/portal/customer/overview');
        }
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out to Guest mode', 'info');
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/portal')) {
      navigate('/');
    }
  };

  return (
    <div className="bg-slate-900 text-white text-xs border-b border-slate-800 py-2 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium">Role Evaluation Switcher:</span>
          {user ? (
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-amber-300 font-semibold inline-flex items-center gap-1.5">
              {user.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
              {user.role === 'AGENT' && <Briefcase className="w-3 h-3 text-blue-400" />}
              {user.role === 'CUSTOMER' && <UserCheck className="w-3 h-3 text-indigo-400" />}
              {user.first_name} ({user.role})
            </span>
          ) : (
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-medium">
              Guest (Public Visitor)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSwitch('ADMIN')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              user?.role === 'ADMIN'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Super Admin
          </button>
          <button
            onClick={() => handleSwitch('AGENT')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              user?.role === 'AGENT'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Agent Sarah
          </button>
          <button
            onClick={() => handleSwitch('CUSTOMER')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              user?.role === 'CUSTOMER'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Customer Alex
          </button>
          {user && (
            <button
              onClick={handleLogout}
              title="Logout to Guest"
              className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
