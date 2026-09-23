import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import { Calendar, Clock, MapPin, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function AgentAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAgentAppointments();
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

  const handleUpdateStatus = async (id, status) => {
    try {
      let cancellationReason = undefined;
      if (status === 'REJECTED' || status === 'CANCELLED') {
        const input = window.prompt(`Optional note or reason for ${status === 'REJECTED' ? 'declining' : 'cancelling'} this tour:`);
        if (input === null) return; // User clicked Cancel in prompt
        cancellationReason = input || (status === 'REJECTED' ? 'Declined by agent' : 'Cancelled by agent');
      }
      await appointmentService.updateStatus(id, { status, cancellationReason });
      addToast(`Appointment ${status.toLowerCase()}`, 'success');
      loadAppointments();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout
      title="Viewing Appointments Schedule"
      subtitle="Review customer tour requests and confirm your on-site meeting schedule."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Appointments Booked</h3>
            <p className="text-xs text-slate-500">Upcoming customer tour bookings will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
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
                    <span className="text-xs font-bold text-blue-700">
                      Property: {apt.property_title}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{formatDate(apt.requested_date)}</span>
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

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.customer_first_name} {apt.customer_last_name}</span>
                    </div>
                    {apt.customer_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.customer_email}</span>
                      </div>
                    )}
                    {apt.customer_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  {apt.notes && (
                    <p className="text-xs text-slate-500 italic">
                      Client Note: "{apt.notes}"
                    </p>
                  )}

                  {apt.cancellation_reason && (
                    <div className="text-xs text-rose-700 bg-rose-50/80 p-2.5 rounded-lg border border-rose-100">
                      <span className="font-semibold">Decline / Cancel Reason: </span>
                      {apt.cancellation_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex sm:flex-col gap-2">
                  {apt.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Confirm Tour
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </>
                  )}
                  {apt.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold text-xs transition-colors"
                      >
                        Cancel Tour
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
