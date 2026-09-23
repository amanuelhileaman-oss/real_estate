import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white font-display tracking-tight">
                Apex<span className="text-blue-500">Realty</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise-grade real estate discovery powered by PostgreSQL and PostGIS geographic spatial intelligence.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Agent Listings & Fast Approvals</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Discover</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/properties" className="hover:text-white transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link to="/properties?listingType=FOR_SALE" className="hover:text-white transition-colors">
                  Homes for Sale
                </Link>
              </li>
              <li>
                <Link to="/properties?listingType=FOR_RENT" className="hover:text-white transition-colors">
                  Properties for Rent
                </Link>
              </li>
              <li>
                <Link to="/properties?type=VILLA" className="hover:text-white transition-colors">
                  Luxury Villas
                </Link>
              </li>
              <li>
                <Link to="/properties?view=map" className="hover:text-white transition-colors">
                  PostGIS Radius Map Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Portals</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/agents" className="hover:text-white transition-colors">
                  Agent Showcase
                </Link>
              </li>
              <li>
                <Link to="/portal/agent/properties/new" className="hover:text-white transition-colors">
                  List a Property (Agents)
                </Link>
              </li>
              <li>
                <Link to="/portal/customer/favorites" className="hover:text-white transition-colors">
                  Customer Saved Homes
                </Link>
              </li>
              <li>
                <Link to="/admin/moderation" className="hover:text-white transition-colors">
                  Admin Listing Approval
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-white transition-colors">
                  Platform Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact / Tech */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Architecture</h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Spatial PostGIS indexing with <code className="text-blue-400">ST_DWithin</code> radius queries and <code className="text-blue-400">ST_MakeEnvelope</code> viewport syncing.
            </p>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Austin, TX & Los Angeles, CA</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@apexrealty.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} ApexRealty Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>PostGIS Geospatial Engine v3.6</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
