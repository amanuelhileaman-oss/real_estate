import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import PropertyCatalogPage from './pages/PropertyCatalogPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AgentDirectoryPage from './pages/AgentDirectoryPage';
import AgentPublicProfilePage from './pages/AgentPublicProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Chat Messenger
import ChatPage from './pages/chat/ChatPage';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerFavorites from './pages/customer/CustomerFavorites';
import CustomerInquiries from './pages/customer/CustomerInquiries';
import CustomerAppointments from './pages/customer/CustomerAppointments';
import CustomerNotificationsPage from './pages/customer/CustomerNotificationsPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import CustomerDealsPage from './pages/customer/CustomerDealsPage';

// Agent Pages
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentListings from './pages/agent/AgentListings';
import CreateListingPage from './pages/agent/CreateListingPage';
import EditListingPage from './pages/agent/EditListingPage';
import PropertyMediaPage from './pages/agent/PropertyMediaPage';
import AgentInquiries from './pages/agent/AgentInquiries';
import AgentAppointments from './pages/agent/AgentAppointments';
import AgentProfilePage from './pages/agent/AgentProfilePage';
import AgentDealsPage from './pages/agent/AgentDealsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminModerationQueue from './pages/admin/AdminModerationQueue';
import AdminPropertiesPage from './pages/admin/AdminPropertiesPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Layout Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/properties" element={<PropertyCatalogPage />} />
                <Route path="/search" element={<PropertyCatalogPage />} />
                <Route path="/properties/:slugOrId" element={<PropertyDetailPage />} />
                <Route path="/agents" element={<AgentDirectoryPage />} />
                <Route path="/agents/:id" element={<AgentPublicProfilePage />} />
                <Route path="/agents/profile/:id" element={<AgentPublicProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Universal Chat Access for Authenticated Users */}
              <Route
                path="/portal/chat"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'AGENT', 'ADMIN']}>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              {/* Customer Portal (Protected) */}
              <Route
                path="/portal/customer/*"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <Routes>
                      <Route path="overview" element={<CustomerDashboard />} />
                      <Route path="deals" element={<CustomerDealsPage />} />
                      <Route path="chat" element={<ChatPage />} />
                      <Route path="favorites" element={<CustomerFavorites />} />
                      <Route path="inquiries" element={<CustomerInquiries />} />
                      <Route path="appointments" element={<CustomerAppointments />} />
                      <Route path="notifications" element={<CustomerNotificationsPage />} />
                      <Route path="profile" element={<CustomerProfilePage />} />
                      <Route path="*" element={<Navigate to="overview" replace />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Agent Portal (Protected) */}
              <Route
                path="/portal/agent/*"
                element={
                  <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
                    <Routes>
                      <Route path="dashboard" element={<AgentDashboard />} />
                      <Route path="properties" element={<AgentListings />} />
                      <Route path="properties/new" element={<CreateListingPage />} />
                      <Route path="properties/:id/edit" element={<EditListingPage />} />
                      <Route path="properties/:id/media" element={<PropertyMediaPage />} />
                      <Route path="deals" element={<AgentDealsPage />} />
                      <Route path="chat" element={<ChatPage />} />
                      <Route path="inquiries" element={<AgentInquiries />} />
                      <Route path="appointments" element={<AgentAppointments />} />
                      <Route path="profile" element={<AgentProfilePage />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Admin Portal (Protected) */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="moderation" element={<AdminModerationQueue />} />
                      <Route path="properties" element={<AdminPropertiesPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="reports" element={<AdminReportsPage />} />
                      <Route path="chat" element={<ChatPage />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
