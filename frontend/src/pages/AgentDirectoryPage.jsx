import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Users, Star, Phone, Mail, Award, Search, Building } from 'lucide-react';
import Button from '../components/common/Button';

export default function AgentDirectoryPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        const res = await apiRequest(`/agents?search=${encodeURIComponent(search)}`);
        setAgents(res.data);
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
          <Award className="w-3.5 h-3.5" />
          <span>Licensed Professionals</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">
          Top Real Estate Agents & Advisors
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Connect with trusted advisors who know neighborhoods inside-out and guide you through transparent negotiations.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agent by name, agency, or city..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No agents found</h3>
          <p className="text-xs text-slate-500">Try refining your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
                    {agent.first_name?.[0] || 'A'}
                  </div>
                  {agent.rating_avg > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span>{agent.rating_avg}</span>
                      <span className="text-slate-400 font-normal">({agent.review_count})</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-display">
                  {agent.first_name} {agent.last_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold mb-2">
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span>{agent.agency_name || 'Premier Realty Advisors'}</span>
                </div>

                {agent.license_number && (
                  <p className="text-[11px] text-slate-400 font-mono mb-3">
                    License: {agent.license_number}
                  </p>
                )}

                {agent.bio && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                    {agent.bio}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                {agent.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.phone}</span>
                  </div>
                )}
                {agent.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.email}</span>
                  </div>
                )}

                <Link to={`/properties?query=${encodeURIComponent(agent.first_name)}`} className="block pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    View Listings by {agent.first_name}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
