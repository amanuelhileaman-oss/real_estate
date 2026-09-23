import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Building2, Mail, Lock, User, Phone, Briefcase, Award } from 'lucide-react';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

export default function RegisterPage() {
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'AGENT'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    agencyName: '',
    licenseNumber: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = await register({
        ...formData,
        role
      });
      addToast(`Account created! Welcome, ${user.first_name}.`, 'success');

      if (user.role === 'AGENT') navigate('/portal/agent/dashboard');
      else navigate('/portal/customer/overview');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 font-display">
            Create your account
          </h2>
          <p className="text-xs text-slate-500">
            Join thousands of home buyers, renters, and licensed real estate agents.
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

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                icon={User}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
              <Input
                label="Last Name"
                required
                icon={User}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              required
              icon={Mail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              required
              icon={Lock}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />

            <Input
              label="Phone Number"
              type="tel"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />

            {/* Agent Specific Fields */}
            {role === 'AGENT' && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4 pt-4 mt-2">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Agent Accreditation Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Agency / Brokerage Name"
                    required
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    placeholder="e.g. Austin Premier Estates"
                  />
                  <Input
                    label="Real Estate License #"
                    required
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. TX-RE-98410"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Professional Bio
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Briefly describe your market specialty and background..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Create {role === 'AGENT' ? 'Agent Account' : 'Customer Account'}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">Or</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          
          <GoogleAuthButton 
            role={role} 
            text="signup_with" 
            additionalData={{
              phone: formData.phone,
              agencyName: formData.agencyName,
              licenseNumber: formData.licenseNumber,
              bio: formData.bio
            }} 
          />

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
