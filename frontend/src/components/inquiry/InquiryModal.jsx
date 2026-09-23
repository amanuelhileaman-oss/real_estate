import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { inquiryService } from '../../services/inquiryService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Mail, Phone, User, MessageSquare } from 'lucide-react';

export default function InquiryModal({ isOpen, onClose, property }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: user ? `${user.first_name} ${user.last_name}` : '',
    email: user ? user.email : '',
    phone: user ? user.phone || '' : '',
    message: `Hello, I would like to receive more information about "${property?.title}".`
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inquiryService.submitInquiry({
        propertyId: property.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message
      });
      addToast('Your inquiry has been sent to the listing agent!', 'success');
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contact Agent for ${property?.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Your Full Name"
          required
          icon={User}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Jane Doe"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            label="Phone Number"
            type="tel"
            icon={Phone}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Your Message
          </label>
          <div className="relative">
            <textarea
              rows={4}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <MessageSquare className="w-4 h-4" />
            Send Inquiry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
