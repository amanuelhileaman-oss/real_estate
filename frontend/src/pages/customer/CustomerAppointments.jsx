import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import { Calendar, Clock, MapPin, Phone, Mail, User, XCircle } from 'lucide-react';

export default function CustomerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getMyAppointments();
      setAppointments(data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this viewing request?')) return;
    try {
      await appointmentService.updateStatus(id, {
        status: 'CANCELLED',
        cancellationReason: 'Cancelled by customer'
      });
      addToast('Appointment cancelled', 'info');
      loadAppointments();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout
      title="Scheduled Property Viewings"
      subtitle="Track appointment confirmations and manage your tour itinerary."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Viewings Scheduled</h3>
            <p className="text-xs text-slate-500 mb-6">
              When you find a home you love, click "Schedule a Viewing Tour" on the listing page.
            </p>
            <Link to="/properties">
              <Button variant="primary">Browse Homes</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        apt.status === 'CONFIRMED'
                          ? 'emerald'
                          : apt.status === 'CANCELLED' || apt.status === 'REJECTED'
                          ? 'rose'
                          : apt.status === 'COMPLETED'
                          ? 'primary'
                          : 'amber'
                      }
                    >
                      {apt.status === 'REJECTED' ? 'DECLINED' : apt.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Requested on {formatDate(apt.created_at)}
                    </span>
                  </div>

                  <Link
                    to={`/properties/${apt.property_slug || apt.property_id}`}
                    className="block text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors font-display"
                  >
                    {apt.property_title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{formatDate(apt.requested_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{apt.time_slot}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{apt.street_address}, {apt.city}</span>
                    </div>
                  </div>

                  {apt.cancellation_reason && (
                    <div className="p-3 bg-rose-50/80 border border-rose-100 rounded-xl text-xs text-rose-800">
                      <span className="font-bold">Agent Note: </span>
                      {apt.cancellation_reason}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="font-semibold text-slate-700">Agent:</span>
                    <span>{apt.agent_first_name} {apt.agent_last_name}</span>
                    {apt.agent_phone && <span>• {apt.agent_phone}</span>}
                  </div>
                </div>

                {(apt.status === 'PENDING' || apt.status === 'CONFIRMED') && (
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(apt.id)}
                      className="text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Request
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
