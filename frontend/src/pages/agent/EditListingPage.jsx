import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import MapLocationPicker from '../../components/map/MapLocationPicker';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import { PROPERTY_TYPES } from '../../utils/constants';
import {
  Save,
  ArrowLeft,
  Loader2,
  Building,
  Home,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const data = await propertyService.getPropertyDetails(id);
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price ? String(data.price) : '',
          currency: data.currency || 'USD',
          pricePeriod: data.price_period || 'MONTHLY',
          listingTypeCode: data.listing_type_code || 'FOR_SALE',
          propertyTypeCode: data.property_type_code || 'APARTMENT',
          bedrooms: data.bedrooms !== null && data.bedrooms !== undefined ? String(data.bedrooms) : '',
          bathrooms: data.bathrooms !== null && data.bathrooms !== undefined ? String(data.bathrooms) : '',
          areaSqm: data.area_sqm ? String(data.area_sqm) : '',
          lotSizeSqm: data.lot_size_sqm ? String(data.lot_size_sqm) : '',
          yearBuilt: data.year_built ? String(data.year_built) : '',
          parkingSpaces: data.parking_spaces ? String(data.parking_spaces) : '0',
          furnishedStatus: data.furnished_status || 'UNFURNISHED',
          country: data.country || '',
          stateRegion: data.state_region || '',
          city: data.city || '',
          subcityDistrict: data.subcity_district || '',
          streetAddress: data.street_address || '',
          postalCode: data.postal_code || '',
          latitude: parseFloat(data.latitude) || 30.2672,
          longitude: parseFloat(data.longitude) || -97.7431
        });
      } catch (err) {
        addToast(err.message || 'Failed to load property details', 'error');
        navigate('/portal/agent/properties');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProperty();
    }
  }, [id, navigate, addToast]);

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
      setSubmitting(true);
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

      await propertyService.updateProperty(id, payload);
      addToast('Property listing and PostGIS location successfully updated!', 'success');
      navigate('/portal/agent/properties');
    } catch (err) {
      addToast(err.message || 'Failed to update property', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Property Listing">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-1/4" />
          <div className="h-64 bg-slate-200 rounded-3xl" />
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Edit Property Listing & Location"
      subtitle="Modify property details and reposition exact PostGIS spatial coordinates."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/portal/agent/properties"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Listings</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {/* 1. Basic Details */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building className="w-5 h-5 text-blue-600" />
              1. Basic Information
            </h3>

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
                Property Description
              </label>
              <textarea
                rows={4}
                required
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 2. Specs */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Home className="w-5 h-5 text-blue-600" />
              2. Dimensions & Specifications
            </h3>

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

          {/* 3. Geographic Location & Interactive Map */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              3. Geographic Spatial Placement (PostGIS)
            </h3>
            <p className="text-xs text-slate-500">
              Drag the marker or search for an address to pinpoint exact geographic coordinates.
            </p>

            <MapLocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              addressHint={[formData.streetAddress, formData.subcityDistrict, formData.city, formData.stateRegion, formData.country].filter(Boolean).join(', ')}
              onChange={handleLocationChange}
              onAddressResolved={handleAddressResolved}
              className="h-80 w-full rounded-2xl"
            />

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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link to="/portal/agent/properties">
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="shadow-lg shadow-blue-500/25"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Property & Coordinates</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
