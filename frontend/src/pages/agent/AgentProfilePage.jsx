import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  Save,
  Loader2,
  ExternalLink,
  Award,
  CheckCircle2,
  Star,
  FileBadge
} from 'lucide-react';

export default function AgentProfilePage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    agencyName: '',
    bio: '',
    officePhone: '',
    officeAddress: '',
    websiteUrl: '',
    avatarUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone || '',
        agencyName: user.agency_name || '',
        bio: user.bio || '',
        officePhone: user.office_phone || '',
        officeAddress: user.office_address || '',
        websiteUrl: user.website_url || '',
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
        agencyName: formData.agencyName.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        officePhone: formData.officePhone.trim() || undefined,
        officeAddress: formData.officeAddress.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined
      });
      await refreshUser();
      addToast('Agent profile successfully updated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = Boolean(user?.verified_at);

  return (
    <DashboardLayout
      title="Advisor Accreditation & Public Profile"
      subtitle="Manage your public bio, brokerage branding, license information, and contact channels."
    >
      <div className="max-w-3xl space-y-6">
        {/* Profile Header & Status */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                formData.firstName?.[0] || 'A'
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {user?.first_name} {user?.last_name}
                </h2>
                {isVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Broker
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    Licensed Agent
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-600 font-semibold">{formData.agencyName || 'Independent Broker'}</p>
              {user?.license_number && (
                <p className="text-[11px] text-slate-400 font-mono">
                  State License #{user.license_number}
                </p>
              )}
            </div>
          </div>

          <Link to={`/agents/profile/${user?.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
              <span>View Public Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mobile Contact Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +1 (512) 555-0144"
              />
              <Input
                label="Avatar Image URL"
                type="url"
                value={formData.avatarUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Agency & Public Branding
            </h3>

            <Input
              label="Brokerage / Agency Firm Name"
              value={formData.agencyName}
              onChange={(e) => setFormData((prev) => ({ ...prev, agencyName: e.target.value }))}
              placeholder="e.g. ApexRealty Premier Advisors"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Professional Bio & Value Proposition
              </label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Describe your market expertise, specializations (luxury, waterfront, commercial), and customer commitment..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Office Phone"
                type="tel"
                value={formData.officePhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, officePhone: e.target.value }))}
                placeholder="e.g. +1 (512) 555-0100"
              />
              <Input
                label="Website URL"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://apexrealty.com/agents/sarah"
              />
            </div>

            <Input
              label="Office Street Address"
              value={formData.officeAddress}
              onChange={(e) => setFormData((prev) => ({ ...prev, officeAddress: e.target.value }))}
              placeholder="e.g. 100 Congress Ave, Suite 1800, Austin, TX 78701"
            />
          </div>

          {/* Verification Badge Note */}
          <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
            <Award className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              {isVerified
                ? `Your agency license is fully verified. Verified status is highlighted on all your listings and search results.`
                : `Your account is pending administrative verification. Provide your license details to our moderation team for accreditation.`}
            </span>
          </div>

          <div className="flex justify-end pt-2">
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
                  <span>Save Advisor Profile</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
