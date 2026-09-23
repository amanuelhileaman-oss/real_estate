import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Building2, Mail, Lock, KeyRound, ShieldCheck, Briefcase, UserCheck, Eye, EyeOff } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../utils/constants';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email, password);
      addToast(`Welcome back, ${user.first_name}!`, 'success');

      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'AGENT') navigate('/portal/agent/dashboard');
      else navigate(from === '/' ? '/portal/customer/overview' : from);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clicking a role card autofills the Email and Password fields
  const handleSelectRole = (role) => {
    const creds = DEMO_ACCOUNTS[role];
    if (creds) {
      setSelectedRole(role);
      setEmail(creds.email);
      setPassword(creds.password);
      addToast(`Filled ${role} credentials (${creds.email}). Click Sign In to continue.`, 'info');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 font-display">
            Sign in to your account
          </h2>
          <p className="text-xs text-slate-500">
            Access your saved favorites, listings manager, or platform controls.
          </p>
        </div>

        {/* Quick Role Autofill Cards */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Role Presets (Click to Fill):</span>
            </div>
            <span className="text-[10px] text-slate-400">Click role to populate form</span>
          </div>

          <div className="grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() => handleSelectRole('AGENT')}
              className={`p-2.5 rounded-xl text-left transition-all border ${
                selectedRole === 'AGENT'
                  ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-500/40'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Briefcase className="w-4 h-4 text-blue-400" />
                {selectedRole === 'AGENT' && (
                  <span className="text-[8px] bg-blue-500 text-slate-950 font-extrabold px-1 rounded">FILLED</span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-200">Agent Demo</div>
              <div className="text-[10px] text-blue-300 font-medium">Sarah J.</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('CUSTOMER')}
              className={`p-2.5 rounded-xl text-left transition-all border ${
                selectedRole === 'CUSTOMER'
                  ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 hover:border-indigo-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                {selectedRole === 'CUSTOMER' && (
                  <span className="text-[8px] bg-indigo-500 text-slate-950 font-extrabold px-1 rounded">FILLED</span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-200">Customer Demo</div>
              <div className="text-[10px] text-indigo-300 font-medium">Alex M.</div>
            </button>
          </div>
        </div>


        {/* Login Form */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              icon={Mail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSelectedRole(null);
              }}
              placeholder="name@example.com"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                icon={Lock}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedRole(null);
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full shadow-md shadow-blue-600/20" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Or</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          
          <GoogleAuthButton role="CUSTOMER" text="signin_with" additionalData={{ action: 'login' }} />

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
