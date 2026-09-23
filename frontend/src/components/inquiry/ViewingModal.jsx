import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { appointmentService } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';

const TIME_SLOTS = [
  { value: '09:00 - 10:00', label: 'Morning (09:00 AM - 10:00 AM)' },
  { value: '11:00 - 12:00', label: 'Late Morning (11:00 AM - 12:00 PM)' },
  { value: '14:00 - 15:00', label: 'Early Afternoon (02:00 PM - 03:00 PM)' },
  { value: '16:00 - 17:00', label: 'Late Afternoon (04:00 PM - 05:00 PM)' },
  { value: '18:00 - 19:00', label: 'Evening (06:00 PM - 07:00 PM)' }
];

export default function ViewingModal({ isOpen, onClose, property }) {
  const { isAuthenticated, isCustomer } = useAuth();
  const { addToast } = useToast();

  // Tomorrow as default date string YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    requestedDate: tomorrow,
    timeSlot: '14:00 - 15:00',
    alternativeDate: '',
    notes: 'Looking forward to viewing this property in person.'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please sign in to schedule a property viewing.', 'info');
      return;
    }

    if (!isCustomer) {
      addToast('Only registered customers can book viewing appointments. Please switch to a Customer account.', 'error');
      return;
    }

    try {
      setLoading(true);
      await appointmentService.requestViewing({
        propertyId: property.id,
        requestedDate: formData.requestedDate,
        timeSlot: formData.timeSlot,
        alternativeDate: formData.alternativeDate || null,
        notes: formData.notes
      });
      addToast('Viewing requested! The agent will confirm your appointment shortly.', 'success');
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule a Tour: ${property?.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-800">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Select your preferred date and time slot. The listing agent will review and confirm your viewing.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Preferred Date"
            type="date"
            required
            min={new Date().toISOString().split('T')[0]}
            value={formData.requestedDate}
            onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
          />
          <Select
            label="Preferred Time Slot"
            required
            options={TIME_SLOTS}
            value={formData.timeSlot}
            onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
          />
        </div>

        <Input
          label="Alternative Date (Optional)"
          type="date"
          min={new Date().toISOString().split('T')[0]}
          value={formData.alternativeDate}
          onChange={(e) => setFormData({ ...formData, alternativeDate: e.target.value })}
          helperText="In case the listing agent is unavailable on your primary date."
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Special Requests / Questions for Agent
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            placeholder="e.g. Inquiring about HOA rules, private parking, or virtual video tour preference..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <CheckCircle2 className="w-4 h-4" />
            Request Appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
