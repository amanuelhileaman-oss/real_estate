import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import MapLocationPicker from '../../components/map/MapLocationPicker';
import { propertyService } from '../../services/propertyService';
import { useToast } from '../../context/ToastContext';
import { PROPERTY_TYPES, LISTING_TYPES, AMENITY_OPTIONS } from '../../utils/constants';
import {
  Building2,
  FileText,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  X,
  Sparkles
} from 'lucide-react';

export default function CreateListingPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyTypeCode: 'HOUSE',
    listingTypeCode: 'FOR_SALE',
    price: '',
    currency: 'USD',
    pricePeriod: '',
    bedrooms: '3',
    bathrooms: '2',
    areaSqm: '180',
    lotSizeSqm: '500',
    yearBuilt: '2022',
    parkingSpaces: '2',
    furnishedStatus: 'UNFURNISHED',
    features: ['swimming_pool', 'smart_home'],
    country: '',
    stateRegion: '',
    city: '',
    subcityDistrict: '',
    streetAddress: '',
    postalCode: '',
    latitude: '',
    longitude: ''
  });

  // Selected image files
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (featureId) => {
    setFormData((prev) => {
      const exists = prev.features.includes(featureId);
      return {
        ...prev,
        features: exists
          ? prev.features.filter((f) => f !== featureId)
          : [...prev.features, featureId]
      };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...urls]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      let lat = parseFloat(formData.latitude);
      let lng = parseFloat(formData.longitude);

      // Auto-geocode from address if not manually set on map
      if (isNaN(lat) || isNaN(lng)) {
        const queryText = [formData.streetAddress, formData.city, formData.stateRegion, formData.country].filter(Boolean).join(', ');
        if (queryText) {
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=1`, {
              headers: { 'Accept': 'application/json' }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.length > 0) {
                lat = parseFloat(geoData[0].lat);
                lng = parseFloat(geoData[0].lon);
              }
            }
          } catch (e) {
            console.warn('Geocoding fallback notice:', e);
          }
        }
      }

      if (isNaN(lat) || isNaN(lng)) {
        addToast('Please specify the property address or click on the map to place the location marker.', 'error');
        setSubmitting(false);
        setStep(3);
        return;
      }

      // 1. Create Property
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        pricePeriod: formData.listingTypeCode === 'FOR_RENT' ? (formData.pricePeriod || 'MONTHLY') : null,
        areaSqm: parseFloat(formData.areaSqm),
        lotSizeSqm: formData.lotSizeSqm ? parseFloat(formData.lotSizeSqm) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : 0,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : 0,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt, 10) : null,
        parkingSpaces: parseInt(formData.parkingSpaces || '0', 10),
        subcityDistrict: formData.subcityDistrict?.trim() || null,
        postalCode: formData.postalCode?.trim() || null,
        latitude: lat,
        longitude: lng,
        status: 'PENDING_APPROVAL'
      };

      const created = await propertyService.createProperty(payload);

      // 2. Upload Selected Images if any
      if (selectedFiles.length > 0) {
        const uploadForm = new FormData();
        selectedFiles.forEach((file) => {
          uploadForm.append('images', file);
        });
        await propertyService.uploadMedia(created.id, uploadForm);
      }

      addToast('Listing created and submitted for Admin approval!', 'success');
      navigate('/portal/agent/properties');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basics', icon: FileText },
    { num: 2, title: 'Specs & Amenities', icon: Sparkles },
    { num: 3, title: 'Location (PostGIS)', icon: MapPin },
    { num: 4, title: 'Media & Photos', icon: ImageIcon },
    { num: 5, title: 'Review & Submit', icon: CheckCircle2 }
  ];

  return (
    <DashboardLayout
      title="Create New Property Listing"
      subtitle="Follow the step-by-step wizard to publish your listing."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Step Progress Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isDone = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                        : isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Step {s.num}</div>
                    <div className={`text-xs font-semibold ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                      {s.title}
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-6 sm:w-12 h-0.5 bg-slate-200 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Form Containers */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 font-display">1. Property Essentials</h2>

              <Input
                label="Property Headline / Title"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g. Modern Glass Pavilion with Waterfront Views"
                helperText="A descriptive headline highlighting the architectural aesthetic or setting."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Property Category"
                  required
                  options={PROPERTY_TYPES.map((t) => ({ value: t.code, label: t.name }))}
                  value={formData.propertyTypeCode}
                  onChange={(e) => handleInputChange('propertyTypeCode', e.target.value)}
                />

                <Select
                  label="Listing Type"
                  required
                  options={LISTING_TYPES.map((l) => ({ value: l.code, label: l.name }))}
                  value={formData.listingTypeCode}
                  onChange={(e) => handleInputChange('listingTypeCode', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Asking Price ($)"
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="e.g. 1250000"
                />

                <Select
                  label="Currency"
                  options={[{ value: 'USD', label: 'USD ($)' }]}
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                />

                {formData.listingTypeCode === 'FOR_RENT' && (
                  <Select
                    label="Rent Period"
                    options={[
                      { value: 'MONTHLY', label: 'Per Month' },
                      { value: 'YEARLY', label: 'Per Year' },
                      { value: 'DAILY', label: 'Per Day' }
                    ]}
                    value={formData.pricePeriod || 'MONTHLY'}
                    onChange={(e) => handleInputChange('pricePeriod', e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Detailed Property Narrative
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide an enticing description of the spaces, finishes, outdoor living areas, and local neighborhood benefits..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 2: SPECS & AMENITIES */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 font-display">2. Specifications & Amenities</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                />
                <Input
                  label="Bathrooms"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                />
                <Input
                  label="Area (m²)"
                  type="number"
                  required
                  value={formData.areaSqm}
                  onChange={(e) => handleInputChange('areaSqm', e.target.value)}
                />
                <Input
                  label="Lot Size (m²)"
                  type="number"
                  value={formData.lotSizeSqm}
                  onChange={(e) => handleInputChange('lotSizeSqm', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Year Built"
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                />
                <Input
                  label="Parking Spaces"
                  type="number"
                  value={formData.parkingSpaces}
                  onChange={(e) => handleInputChange('parkingSpaces', e.target.value)}
                />
                <Select
                  label="Furnishing Status"
                  options={[
                    { value: 'UNFURNISHED', label: 'Unfurnished' },
                    { value: 'SEMI_FURNISHED', label: 'Semi-Furnished' },
                    { value: 'FURNISHED', label: 'Fully Furnished' }
                  ]}
                  value={formData.furnishedStatus}
                  onChange={(e) => handleInputChange('furnishedStatus', e.target.value)}
                />
              </div>

              {/* Amenity Checkboxes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Select Included Amenities & Features
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const checked = formData.features.includes(amenity.id);
                    return (
                      <button
                        type="button"
                        key={amenity.id}
                        onClick={() => handleFeatureToggle(amenity.id)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 ${checked
                            ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                        >
                          {checked && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span>{amenity.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & POSTGIS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">3. Geographic Spatial Placement</h2>
                <p className="text-xs text-slate-500">
                  Enter your property address, and the map will automatically locate your property anywhere in the world.
                </p>
              </div>

              {/* Address Fields First */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Country"
                    required
                    placeholder="e.g. Ethiopia, United States, France..."
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                  <Input
                    label="State / Region"
                    required
                    placeholder="e.g. Amhara, Texas, Île-de-France..."
                    value={formData.stateRegion}
                    onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    required
                    placeholder="e.g. Gondar, Addis Ababa, Austin..."
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                  <Input
                    label="Subcity / District"
                    placeholder="e.g. Maraki, Bole, Downtown..."
                    value={formData.subcityDistrict}
                    onChange={(e) => handleInputChange('subcityDistrict', e.target.value)}
                  />
                  <Input
                    label="Postal Code"
                    placeholder="Optional postal code"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  />
                </div>

                <Input
                  label="Street Address / Neighborhood"
                  required
                  value={formData.streetAddress}
                  onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                  placeholder="e.g. Main Street, House #42, Maraki campus area..."
                />
              </div>

              {/* Interactive Location Picker Map synced with property address */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Interactive Map Pin (PostGIS Spatial Coordinates)
                </label>
                <MapLocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  addressHint={[formData.streetAddress, formData.subcityDistrict, formData.city, formData.stateRegion, formData.country].filter(Boolean).join(', ')}
                  onChange={(lat, lng) => {
                    handleInputChange('latitude', lat);
                    handleInputChange('longitude', lng);
                  }}
                  onAddressResolved={(addr) => {
                    if (addr.country && !formData.country) handleInputChange('country', addr.country);
                    if (addr.stateRegion && !formData.stateRegion) handleInputChange('stateRegion', addr.stateRegion);
                    if (addr.city && !formData.city) handleInputChange('city', addr.city);
                    if (addr.subcityDistrict && !formData.subcityDistrict) handleInputChange('subcityDistrict', addr.subcityDistrict);
                    if (addr.streetAddress && !formData.streetAddress) handleInputChange('streetAddress', addr.streetAddress);
                    if (addr.postalCode && !formData.postalCode) handleInputChange('postalCode', addr.postalCode);
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: MEDIA UPLOAD */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">4. Media & Gallery Photos</h2>
                <p className="text-xs text-slate-500">
                  Upload high-resolution property photography. Files are automatically converted to optimized WebP format with responsive thumbnails.
                </p>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/20">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Click to select photos or drag & drop
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Supports JPEG, PNG, WEBP up to 10MB per image (max 15 files)
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Preview thumbnails */}
              {previewUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Selected Images ({previewUrls.length}):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 group shadow-xs"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Primary Hero
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">5. Review & Submit for Approval</h2>
                <p className="text-xs text-slate-500">
                  Review the listing details below before submitting to the platform moderation queue.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 text-xs">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{formData.title || 'Untitled'}</h3>
                    <div className="text-slate-500">{formData.streetAddress}, {formData.city}, {formData.stateRegion}</div>
                  </div>
                  <div className="text-lg font-black text-blue-600">
                    ${Number(formData.price || 0).toLocaleString()} {formData.pricePeriod ? `/${formData.pricePeriod.toLowerCase()}` : ''}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  <div><span className="font-semibold text-slate-400">Category:</span> {formData.propertyTypeCode}</div>
                  <div><span className="font-semibold text-slate-400">Terms:</span> {formData.listingTypeCode}</div>
                  <div><span className="font-semibold text-slate-400">Specs:</span> {formData.bedrooms} Beds, {formData.bathrooms} Baths</div>
                  <div><span className="font-semibold text-slate-400">Area:</span> {formData.areaSqm} m²</div>
                </div>

                <div>
                  <span className="font-semibold text-slate-400">PostGIS Coordinates:</span>{' '}
                  <span className="font-mono text-slate-800">{Number(formData.latitude).toFixed(5)}°, {Number(formData.longitude).toFixed(5)}°</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-400">Photos:</span> {selectedFiles.length} images ready for upload
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <strong>Platform Moderation Policy:</strong> All newly submitted listings undergo automated title and coordinate sanity checks, followed by Super Admin review before publishing live on the public map.
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (step === 1 && (!formData.title || !formData.price || !formData.description)) {
                    addToast('Please fill out the title, price, and description before continuing.', 'error');
                    return;
                  }
                  setStep(step + 1);
                }}
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={submitting}
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Listing for Approval
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
