import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, MapPin, Building, DollarSign, Home } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import MapLocationPicker from '../map/MapLocationPicker';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { PROPERTY_TYPES } from '../../utils/constants';

export default function EditListingModal({ property, isOpen, onClose, onUpdated }) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    pricePeriod: 'MONTHLY',
    listingTypeCode: 'FOR_SALE',
    propertyTypeCode: 'APARTMENT',
    bedrooms: '',
    bathrooms: '',
    areaSqm: '',
    lotSizeSqm: '',
    yearBuilt: '',
    parkingSpaces: '0',
    furnishedStatus: 'UNFURNISHED',
    country: '',
    stateRegion: '',
    city: '',
    subcityDistrict: '',
    streetAddress: '',
    postalCode: '',
    latitude: 30.2672,
    longitude: -97.7431
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (property && isOpen) {
      setFormData({
        title: property.title || '',
        description: property.description || '',
        price: property.price ? String(property.price) : '',
        currency: property.currency || 'USD',
        pricePeriod: property.price_period || 'MONTHLY',
        listingTypeCode: property.listing_type_code || 'FOR_SALE',
        propertyTypeCode: property.property_type_code || 'APARTMENT',
        bedrooms: property.bedrooms !== null && property.bedrooms !== undefined ? String(property.bedrooms) : '',
        bathrooms: property.bathrooms !== null && property.bathrooms !== undefined ? String(property.bathrooms) : '',
        areaSqm: property.area_sqm ? String(property.area_sqm) : '',
        lotSizeSqm: property.lot_size_sqm ? String(property.lot_size_sqm) : '',
        yearBuilt: property.year_built ? String(property.year_built) : '',
        parkingSpaces: property.parking_spaces ? String(property.parking_spaces) : '0',
        furnishedStatus: property.furnished_status || 'UNFURNISHED',
        country: property.country || '',
        stateRegion: property.state_region || '',
        city: property.city || '',
        subcityDistrict: property.subcity_district || '',
        streetAddress: property.street_address || '',
        postalCode: property.postal_code || '',
        latitude: parseFloat(property.latitude) || 30.2672,
        longitude: parseFloat(property.longitude) || -97.7431
      });
    }
  }, [property, isOpen]);

  if (!isOpen || !property) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleAddressResolved = (addr) => {
    setFormData((prev) => ({
      ...prev,
      streetAddress: addr.streetAddress || prev.streetAddress,
      city: addr.city || prev.city,
      subcityDistrict: addr.subcityDistrict || prev.subcityDistrict,
      stateRegion: addr.stateRegion || prev.stateRegion,
      country: addr.country || prev.country,
      postalCode: addr.postalCode || prev.postalCode
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        pricePeriod: formData.listingTypeCode === 'FOR_RENT' ? formData.pricePeriod : null,
        listingTypeCode: formData.listingTypeCode,
        propertyTypeCode: formData.propertyTypeCode,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        areaSqm: parseFloat(formData.areaSqm),
        lotSizeSqm: formData.lotSizeSqm ? parseFloat(formData.lotSizeSqm) : null,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt, 10) : null,
        parkingSpaces: parseInt(formData.parkingSpaces || '0', 10),
        furnishedStatus: formData.furnishedStatus,
        country: formData.country,
        stateRegion: formData.stateRegion,
        city: formData.city,
        subcityDistrict: formData.subcityDistrict || null,
        streetAddress: formData.streetAddress,
        postalCode: formData.postalCode || null,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      const updated = await propertyService.updateProperty(property.id, payload);
      addToast('Property details and PostGIS coordinates saved successfully!', 'success');
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update property', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Edit Listing & Geographic Location
            </h3>
            <p className="text-xs text-slate-500">
              Update property specifications, address, and interactive PostGIS map pin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" /> Basic Details
            </h4>

            <Input
              label="Property Title"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Property Type"
                options={PROPERTY_TYPES.map((t) => ({ value: t.code, label: t.name }))}
                value={formData.propertyTypeCode}
                onChange={(e) => handleInputChange('propertyTypeCode', e.target.value)}
              />

              <Select
                label="Listing Type"
                options={[
                  { value: 'FOR_SALE', label: 'For Sale' },
                  { value: 'FOR_RENT', label: 'For Rent' }
                ]}
                value={formData.listingTypeCode}
                onChange={(e) => handleInputChange('listingTypeCode', e.target.value)}
              />

              <Input
                label="Price"
                type="number"
                required
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Section 2: Specs */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-600" /> Specifications
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                label="Bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', e.target.value)}
              />
              <Input
                label="Bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', e.target.value)}
              />
              <Input
                label="Living Area (m²)"
                type="number"
                required
                value={formData.areaSqm}
                onChange={(e) => handleInputChange('areaSqm', e.target.value)}
              />
              <Input
                label="Parking Spaces"
                type="number"
                value={formData.parkingSpaces}
                onChange={(e) => handleInputChange('parkingSpaces', e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Geographic Location & Map */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> PostGIS Geographic Location
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Search address, drag the marker, or click on the map to set coordinates.
                </p>
              </div>
            </div>

            {/* Map Location Picker synced with address */}
            <MapLocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              addressHint={[formData.streetAddress, formData.subcityDistrict, formData.city, formData.stateRegion, formData.country].filter(Boolean).join(', ')}
              onChange={handleLocationChange}
              onAddressResolved={handleAddressResolved}
              className="h-72 w-full rounded-2xl"
            />

            {/* Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Country"
                required
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
              />
              <Input
                label="State / Region"
                required
                value={formData.stateRegion}
                onChange={(e) => handleInputChange('stateRegion', e.target.value)}
              />
              <Input
                label="City"
                required
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
              <Input
                label="Subcity / District"
                value={formData.subcityDistrict}
                onChange={(e) => handleInputChange('subcityDistrict', e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  required
                  value={formData.streetAddress}
                  onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="shadow-md shadow-blue-500/25"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Coordinates & Details</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
