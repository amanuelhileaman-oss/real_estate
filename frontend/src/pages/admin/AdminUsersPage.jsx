import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  User,
  Check,
  X,
  Eye,
  Star,
  CheckCircle2,
  XCircle,
  FileBadge,
  Pencil,
  Trash2
} from 'lucide-react';
import EditUserModal from '../../components/admin/EditUserModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const { addToast } = useToast();

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({
        page,
        role: roleFilter || null,
        search
      });
      setUsers(res.users || []);
      setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load users:', err);
      addToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [roleFilter, search]);

  const handleToggleStatus = async (user) => {
    if (user.role === 'ADMIN') {
      addToast('Cannot modify Super Admin account status.', 'error');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await adminService.setUserStatus(user.id, newStatus);
      addToast(`User account ${newStatus ? 'activated' : 'suspended'}`, 'success');
      loadUsers(meta.page);
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, is_active: newStatus }));
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleAgentVerification = async (user) => {
    const isCurrentlyVerified = Boolean(user.verified_at);
    const newVerificationStatus = !isCurrentlyVerified;
    try {
      await adminService.verifyAgent(user.id, newVerificationStatus);
      addToast(
        `Agent accreditation ${newVerificationStatus ? 'verified and badged' : 'revoked'}`,
        'success'
      );
      loadUsers(meta.page);
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser((prev) => ({
          ...prev,
          verified_at: newVerificationStatus ? new Date().toISOString() : null
        }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to update agent verification', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeletingLoading(true);
    try {
      await adminService.deleteUser(deletingUser.id);
      addToast(`User ${deletingUser.email} and all associated records permanently removed.`, 'success');
      setDeletingUser(null);
      if (selectedUser?.id === deletingUser.id) setSelectedUser(null);
      loadUsers(meta.page);
    } catch (err) {
      addToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="User & Access Governance"
      subtitle="Inspect customer accounts, verify agent licenses, suspend bad actors, and enforce platform trust."
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            {[
              { value: '', label: 'All Users' },
              { value: 'CUSTOMER', label: 'Customers' },
              { value: 'AGENT', label: 'Agents' },
              { value: 'ADMIN', label: 'Admins' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  roleFilter === tab.value
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or license..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No users found</h3>
            <p className="text-xs text-slate-500 mt-1">Try altering search keywords or role filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">User Details</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Agency & Accreditation</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => {
                    const isAgent = u.role === 'AGENT';
                    const isVerified = Boolean(u.verified_at);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              u.role === 'ADMIN'
                                ? 'emerald'
                                : u.role === 'AGENT'
                                ? 'primary'
                                : 'default'
                            }
                          >
                            {u.role}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {u.phone || <span className="text-slate-400 italic">Not set</span>}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {isAgent ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{u.agency_name || 'Independent Agent'}</span>
                                {isVerified ? (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                    Unverified
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Lic: {u.license_number || 'Pending'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect User Modal */}
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit User Account */}
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit User Account"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Agent Verification Toggle */}
                            {isAgent && (
                              <button
                                onClick={() => handleToggleAgentVerification(u)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors border cursor-pointer ${
                                  isVerified
                                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                    : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                                }`}
                                title={isVerified ? 'Revoke Agent Accreditation' : 'Verify Agent License'}
                              >
                                {isVerified ? 'Revoke Badge' : 'Verify Agent'}
                              </button>
                            )}

                            {/* Suspend / Activate Account Toggle */}
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                                  u.is_active
                                    ? 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            )}

                            {/* Delete User Account */}
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                hasNextPage={meta.hasNextPage}
                hasPrevPage={meta.hasPrevPage}
                onPageChange={(p) => loadUsers(p)}
              />
            </div>
          </div>
        )}

        {/* User Details Inspector Modal (Zero sensitive secrets exposed) */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {selectedUser.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 font-display">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {selectedUser.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Core Attributes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</span>
                    <div>
                      <Badge
                        variant={
                          selectedUser.role === 'ADMIN'
                            ? 'emerald'
                            : selectedUser.role === 'AGENT'
                            ? 'primary'
                            : 'default'
                        }
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          selectedUser.is_active ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedUser.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {selectedUser.is_active ? 'Account Active' : 'Account Suspended'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Contact Information
                  </span>
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedUser.phone || 'Phone number not supplied'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Registered on {formatDate(selectedUser.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Agent Profile Details if Agent */}
                {selectedUser.role === 'AGENT' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Agent Profile & Licensing
                    </span>
                    <div className="p-3.5 bg-blue-50/50 rounded-xl space-y-2 border border-blue-100/70">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Brokerage / Agency:</span>
                        <span className="font-bold text-slate-900">{selectedUser.agency_name || 'Independent Broker'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">License Number:</span>
                        <span className="font-mono text-slate-900">{selectedUser.license_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Accreditation:</span>
                        <span className="font-semibold text-slate-900">
                          {selectedUser.verified_at ? (
                            <span className="text-blue-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verified on {formatDate(selectedUser.verified_at)}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unverified</span>
                          )}
                        </span>
                      </div>
                      {selectedUser.rating_avg !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Client Rating:</span>
                          <span className="font-semibold text-amber-600 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {selectedUser.rating_avg || 0} / 5.0 ({selectedUser.review_count || 0} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Guarantee Notice */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Cryptographic credentials and auth secrets are secured and never transmitted to client interfaces.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(selectedUser)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Account
                    </button>
                    {selectedUser.role !== 'ADMIN' && (
                      <button
                        onClick={() => setDeletingUser(selectedUser)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 transition border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        <EditUserModal
          user={editingUser}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          onUpdated={() => loadUsers(meta.page)}
        />

        {/* Confirm Delete User Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(deletingUser)}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete User: ${deletingUser?.first_name} ${deletingUser?.last_name}`}
          message={`Are you sure you want to permanently delete user "${deletingUser?.email}"? All their listings, appointments, inquiries, messages, and deals will be safely removed.`}
          confirmLabel="Delete User Account"
          loading={deletingLoading}
        />
      </div>
    </DashboardLayout>
  );
}
