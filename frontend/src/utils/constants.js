export const PROPERTY_TYPES = [
  { code: 'HOUSE', name: 'House' },
  { code: 'APARTMENT', name: 'Apartment' },
  { code: 'VILLA', name: 'Villa' },
  { code: 'CONDO', name: 'Condo' },
  { code: 'LAND', name: 'Land' },
  { code: 'OFFICE', name: 'Office' },
  { code: 'SHOP', name: 'Shop' },
  { code: 'WAREHOUSE', name: 'Warehouse' },
  { code: 'COMMERCIAL', name: 'Commercial' }
];

export const LISTING_TYPES = [
  { code: 'FOR_SALE', name: 'For Sale' },
  { code: 'FOR_RENT', name: 'For Rent' }
];

export const PROPERTY_STATUSES = [
  { code: 'ACTIVE', name: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'PENDING_APPROVAL', name: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { code: 'REJECTED', name: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { code: 'SOLD', name: 'Sold', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'RENTED', name: 'Rented', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { code: 'DRAFT', name: 'Draft', color: 'bg-slate-50 text-slate-700 border-slate-200' }
];

export const AMENITY_OPTIONS = [
  { id: 'swimming_pool', label: 'Swimming Pool' },
  { id: 'waterfront', label: 'Waterfront / Lake Access' },
  { id: 'smart_home', label: 'Smart Home Automation' },
  { id: 'garden', label: 'Private Garden / Landscaping' },
  { id: 'home_theater', label: 'Home Cinema / Theater' },
  { id: 'wine_cellar', label: 'Wine Cellar' },
  { id: 'gym', label: 'Fitness Center / Gym' },
  { id: 'concierge', label: '24/7 Concierge & Security' },
  { id: 'balcony', label: 'Balcony / Panoramic Terrace' },
  { id: 'ev_charging', label: 'EV Charger Station' },
  { id: 'solar_panels', label: 'Solar Energy Panels' },
  { id: 'guest_house', label: 'Detached Guest House' }
];

// Pre-configured test accounts for evaluation
export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: 'admin@apexrealty.com',
    password: 'AdminSecure2026!',
    label: 'Platform Admin',
    desc: 'Manage users, verify agents, approve/reject property listings, and oversee reports'
  },
  AGENT: {
    email: 'agent.sarah@realestate.com',
    password: 'AgentPass123!',
    label: 'Sarah Jenkins (Agent)',
    desc: 'Create new listings with interactive map picker, manage media, review leads & appointments'
  },
  CUSTOMER: {
    email: 'customer.alex@gmail.com',
    password: 'CustomerPass123!',
    label: 'Alex Mercer (Customer)',
    desc: 'Search properties via PostGIS radius, save favorites, send inquiries & schedule viewings'
  }
};

