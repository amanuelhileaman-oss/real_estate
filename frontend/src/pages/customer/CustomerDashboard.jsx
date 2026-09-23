import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { propertyService } from '../../services/propertyService';
import { appointmentService } from '../../services/appointmentService';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PropertyCard from '../../components/property/PropertyCard';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';
import { Heart, Calendar, ArrowRight, Clock, MapPin } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [favRes, aptRes] = await Promise.all([
          propertyService.getFavorites(1, 3),
          appointmentService.getMyAppointments()
        ]);
        setFavorites(favRes.properties || []);
        setAppointments(aptRes || []);
      } catch (err) {
        console.error('Error loading customer dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.first_name}!`}
      subtitle="Track your saved dream homes and scheduled in-person tours."
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/portal/customer/favorites"
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saved Favorites
              </div>
              <div className="text-3xl font-black text-slate-900 font-display">
                {favorites.length}
              </div>
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <span>View all saved homes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-6 h-6 fill-current text-rose-500" />
            </div>
          </Link>

          <Link
            to="/portal/customer/appointments"
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Scheduled Viewings
              </div>
              <div className="text-3xl font-black text-slate-900 font-display">
                {appointments.length}
              </div>
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <span>Manage appointments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </Link>
        </div>

        {/* Upcoming Viewings Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-display">Upcoming Property Tours</h2>
            <Link to="/portal/customer/appointments" className="text-xs font-semibold text-blue-600 hover:underline">
              View Calendar →
            </Link>
          </div>

          {appointments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              You have no viewing tours scheduled yet. Browse listings to request a tour!
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{apt.property_title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span>{apt.city}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(apt.requested_date)} ({apt.time_slot})</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      apt.status === 'CONFIRMED'
                        ? 'emerald'
                        : apt.status === 'CANCELLED'
                        ? 'rose'
                        : 'amber'
                    }
                  >
                    {apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Saved Favorites */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-display">Recently Saved Homes</h2>
            <Link to="/portal/customer/favorites" className="text-xs font-semibold text-blue-600 hover:underline">
              View All ({favorites.length}) →
            </Link>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
              <p className="text-xs text-slate-400">No properties saved yet.</p>
              <Link to="/properties" className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline">
                Explore listings now →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={{ ...prop, isFavorited: true }}
                  onFavoriteToggle={(id, isFav) => {
                    if (!isFav) setFavorites((prev) => prev.filter((p) => p.id !== id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
