import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon } from '@heroicons/react/24/outline';

const EMPTY = { name: '', email: '', password: '', role: 'member', phone: '', address: '', isActive: true };

export default function ManageUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get('/memberships').then(({ data }) => setPlans(data.plans)).catch(() => {});
  }, []);

  useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/users?${params}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditUser(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '', isActive: u.isActive, membershipPlan: u.membershipPlan?._id || '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) {
        const { data } = await api.put(`/users/${editUser._id}`, payload);
        setUsers(prev => prev.map(u => u._id === editUser._id ? data.user : u));
        toast.success('User updated');
      } else {
        const { data } = await api.post('/users', payload);
        setUsers(prev => [data.user, ...prev]);
        toast.success('User created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteId}`);
      setUsers(prev => prev.filter(u => u._id !== deleteId));
      toast.success('User deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const roleBadge = (role) => {
    const map = { admin: 'bg-red-100 text-red-700', manager: 'bg-orange-100 text-orange-700', member: 'badge-blue' };
    return `badge ${map[role] || 'badge-gray'}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4" /><span>Add User</span>
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..." className="input pl-9" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="input w-40">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </div>
      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Name', 'Email', 'Role', 'Phone', 'Plan', 'Status', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="td font-medium">{u.name}</td>
                  <td className="td text-gray-500 text-xs">{u.email}</td>
                  <td className="td"><span className={roleBadge(u.role)}>{u.role}</span></td>
                  <td className="td text-gray-500 text-xs">{u.phone || '—'}</td>
                  <td className="td text-xs">{u.membershipPlan?.name || '—'}</td>
                  <td className="td">
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => openEdit(u)} className="text-blue-500 hover:text-blue-700 p-1">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => setDeleteId(u._id)} className="text-red-500 hover:text-red-700 p-1">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{pagination.total} total users</div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add New User'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="input" required={!editUser} minLength={6}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="member">Member</option>
                {isAdmin && <option value="manager">Manager</option>}
                {isAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Membership Plan</label>
              <select className="input" value={form.membershipPlan || ''} onChange={e => setForm({ ...form, membershipPlan: e.target.value })}>
                <option value="">No Plan</option>
                {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="input" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active account</label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete User" message="Are you sure you want to delete this user?" danger />
    </div>
  );
}
