import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  ShieldCheck,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function CustomerProfilePage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone || '',
        avatarUrl: user.avatar_url || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      addToast('First and last name are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await authService.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined
      });
      await refreshUser();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Account Profile & Settings"
      subtitle="Manage your personal contact information and communication preferences."
    >
      <div className="max-w-2xl space-y-6">
        {/* User Card Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              formData.firstName?.[0] || 'C'
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {user?.first_name} {user?.last_name}
              </h2>
              <Badge variant="indigo">Customer</Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <p className="text-[11px] text-slate-400">
              Member since {formatDate(user?.created_at)}
            </p>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="e.g. Alex"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="e.g. Mercer"
              required
            />
          </div>

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="e.g. +1 (512) 555-0199"
            helperText="Used by listing agents to confirm viewing appointments."
          />

          <Input
            label="Avatar Photo URL"
            type="url"
            value={formData.avatarUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, avatarUrl: e.target.value }))}
            placeholder="https://images.unsplash.com/..."
            helperText="Direct image link for your profile picture."
          />

          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Primary email is authenticated and cannot be edited directly.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Security & Data Privacy Notice */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Your data is stored with encrypted session tokens. Personal contact information is only shared with agents for confirmed appointments or explicit inquiries.
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
