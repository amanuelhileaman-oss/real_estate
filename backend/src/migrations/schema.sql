-- Production Database Schema for Real Estate Platform
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ 
BEGIN 
  CREATE EXTENSION IF NOT EXISTS "postgis"; 
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'PostGIS extension creation handled: %', SQLERRM;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'AGENT', 'CUSTOMER')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Agent Profiles Table (1-to-1 extension of users for AGENT role)
CREATE TABLE IF NOT EXISTS agent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(150),
    license_number VARCHAR(100) UNIQUE,
    bio TEXT,
    office_address TEXT,
    office_phone VARCHAR(30),
    website_url TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5.00),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lookup: Property Types
CREATE TABLE IF NOT EXISTS property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Lookup: Listing Types
CREATE TABLE IF NOT EXISTS listing_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE, -- 'FOR_SALE', 'FOR_RENT'
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Lookup: Property Statuses
CREATE TABLE IF NOT EXISTS property_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE, -- 'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SOLD', 'RENTED', 'ARCHIVED'
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Core Properties Table with PostGIS Geography
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    property_type_id UUID NOT NULL REFERENCES property_types(id) ON DELETE RESTRICT,
    listing_type_id UUID NOT NULL REFERENCES listing_types(id) ON DELETE RESTRICT,
    status_id UUID NOT NULL REFERENCES property_statuses(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    price_period VARCHAR(20) CHECK (price_period IN ('MONTHLY', 'YEARLY', 'DAILY', NULL)),
    bedrooms INTEGER CHECK (bedrooms >= 0),
    bathrooms NUMERIC(3, 1) CHECK (bathrooms >= 0),
    area_sqm NUMERIC(10, 2) CHECK (area_sqm > 0),
    lot_size_sqm NUMERIC(10, 2) CHECK (lot_size_sqm >= 0),
    year_built INTEGER CHECK (year_built >= 1800),
    parking_spaces INTEGER DEFAULT 0 CHECK (parking_spaces >= 0),
    furnished_status VARCHAR(30) DEFAULT 'UNFURNISHED' CHECK (furnished_status IN ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED')),
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Geographic & Address Hierarchy
    country VARCHAR(100) NOT NULL,
    state_region VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    subcity_district VARCHAR(100),
    street_address TEXT NOT NULL,
    postal_code VARCHAR(30),
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Administrative & engagement fields
    rejection_reason TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & spatial queries
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON properties USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_status_id ON properties(status_id);
CREATE INDEX IF NOT EXISTS idx_properties_type_listing ON properties(property_type_id, listing_type_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON properties USING GIN(city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_features ON properties USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Automatic Point synchronization trigger
CREATE OR REPLACE FUNCTION sync_property_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_property_geom ON properties;
CREATE TRIGGER trg_sync_property_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
FOR EACH ROW EXECUTE FUNCTION sync_property_geom();

-- 7. Property Media Table
CREATE TABLE IF NOT EXISTS property_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO', 'FLOOR_PLAN')),
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    file_key VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_sort_order ON property_media(property_id, sort_order ASC);

-- 8. Customer Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_property_favorite UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- 9. Property Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_agent_id ON inquiries(agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON inquiries(property_id);

-- 10. Viewing Appointments Table
CREATE TABLE IF NOT EXISTS viewing_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    requested_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    alternative_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED')),
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_agent_date ON viewing_appointments(agent_id, requested_date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON viewing_appointments(customer_id);

-- 11. User Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 12. Refresh Tokens Table (Multi-device Session Revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 14. Amenities Table
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Property Amenities (Many-to-Many Junction Table)
CREATE TABLE IF NOT EXISTS property_amenities (
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (property_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_property_amenities_property ON property_amenities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity ON property_amenities(amenity_id);

-- 16. Curated Geographic Locations Table with PostGIS
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    state_region VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    property_count INTEGER DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_location_gist ON locations USING GIST(location);

-- 17. Listing & Moderation Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_property_id ON reports(property_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
