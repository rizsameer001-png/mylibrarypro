import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', form);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try {
      await api.put('/auth/change-password', passwords);
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setChangingPwd(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="card mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
            <UserCircleIcon className="h-10 w-10 text-primary-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="badge badge-blue capitalize mt-1">{user?.role}</span>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword', label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="password" className="input" required minLength={6}
                value={passwords[key]} onChange={e => setPasswords({ ...passwords, [key]: e.target.value })} />
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={changingPwd}>
            {changingPwd ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
