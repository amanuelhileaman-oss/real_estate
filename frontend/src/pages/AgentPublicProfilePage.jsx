import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agentService } from '../services/agentService';
import PropertyCard from '../components/property/PropertyCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  Users,
  Star,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  Calendar,
  Globe,
  MapPin,
  ChevronLeft,
  Home,
  MessageSquare,
  ShieldCheck,
  Award
} from 'lucide-react';

export default function AgentPublicProfilePage() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError('');
        const data = await agentService.getAgentProfile(id);
        setAgent(data);
      } catch (err) {
        console.error('Failed to load agent profile:', err);
        setError(err.message || 'Agent profile could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadProfile();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-6" />
        <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-slate-200 rounded-3xl" />
            <div className="space-y-3 flex-1">
              <div className="h-8 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Agent Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This agent profile does not exist or is inactive.'}</p>
        <Link to="/agents">
          <Button variant="primary" size="md">
            Browse All Agents
          </Button>
        </Link>
      </div>
    );
  }

  const activeListings = agent.activeListings || [];
  const isVerified = Boolean(agent.verified_at);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link to="/agents" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Agent Directory
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{agent.first_name} {agent.last_name}</span>
      </div>

      {/* Hero Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl shrink-0">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={`${agent.first_name} ${agent.last_name}`}
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                agent.first_name?.[0] || 'A'
              )}
            </div>

            {/* Core Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                  {agent.first_name} {agent.last_name}
                </h1>
                {isVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Broker
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    Licensed Agent
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold">
                <Building className="w-4 h-4 shrink-0" />
                <span>{agent.agency_name || 'ApexRealty Certified Brokerage'}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {agent.license_number && (
                  <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Lic #{agent.license_number}
                  </span>
                )}
                {agent.rating_avg > 0 && (
                  <div className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{agent.rating_avg} / 5.0</span>
                    <span className="text-slate-400 font-normal">({agent.review_count || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-center flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Agent</span>
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Agent</span>
              </a>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {agent.bio && (
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Advisor</h3>
            <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
              {agent.bio}
            </p>
          </div>
        )}

        {/* Contact Details Grid */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
          {agent.phone && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile</span>
                <span className="font-semibold text-slate-800">{agent.phone}</span>
              </div>
            </div>
          )}
          {agent.email && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Direct Email</span>
                <span className="font-semibold text-slate-800 truncate block">{agent.email}</span>
              </div>
            </div>
          )}
          {agent.office_phone && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Office Phone</span>
                <span className="font-semibold text-slate-800">{agent.office_phone}</span>
              </div>
            </div>
          )}
          {agent.website_url && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Website</span>
                <a
                  href={agent.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline truncate block"
                >
                  Visit Portal
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Listings Portfolio */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Active Listings by {agent.first_name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified properties currently represented by this advisor.
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
            {activeListings.length} Available
          </span>
        </div>

        {activeListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <Home className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No active listings currently</h3>
            <p className="text-xs text-slate-500">
              This advisor has recently sold or rented all current listings. Check back soon for new inventory.
            </p>
            <Link to="/properties">
              <Button variant="outline" size="sm">
                Explore All Catalog Listings
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeListings.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
