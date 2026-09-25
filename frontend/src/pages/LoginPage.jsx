import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Building2, Mail, Lock, Eye, EyeOff, User, Briefcase } from 'lucide-react';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('CUSTOMER');
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


        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('CUSTOMER')}
            className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'CUSTOMER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-indigo-600" />
            <span>I am a Buyer / Renter</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('AGENT')}
            className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'AGENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>I am a Licensed Agent</span>
          </button>
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
          
          <GoogleAuthButton role={role} text="Sign in with Google" additionalData={{ action: 'login' }} />

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
