import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/index';
import toast from 'react-hot-toast';

export default function ManageSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/cms/settings')
      .then(({ data }) => setSettings(data.settings))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/cms/settings', settings);
      toast.success('Settings saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const setSocial = (key, val) => setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: val } }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Library Name</label>
              <input className="input" value={settings?.siteName || ''} onChange={e => set('siteName', e.target.value)} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={settings?.tagline || ''} onChange={e => set('tagline', e.target.value)} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={settings?.currency || 'USD'} onChange={e => set('currency', e.target.value)}>
                {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Default Language</label>
              <input className="input" value={settings?.defaultLanguage || ''} onChange={e => set('defaultLanguage', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Circulation Rules */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Circulation Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Issue Days (default)</label>
              <input type="number" min="1" className="input" value={settings?.issueDays || 14}
                onChange={e => set('issueDays', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="label">Reserve Days</label>
              <input type="number" min="1" className="input" value={settings?.reserveDays || 3}
                onChange={e => set('reserveDays', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="label">Max Books Per Member</label>
              <input type="number" min="1" className="input" value={settings?.maxBooksPerMember || 5}
                onChange={e => set('maxBooksPerMember', parseInt(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Email</label>
              <input type="email" className="input" value={settings?.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input className="input" value={settings?.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="input" rows={2} value={settings?.address || ''} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Social Media Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['facebook', 'twitter', 'instagram', 'linkedin'].map(k => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input className="input" placeholder={`https://${k}.com/...`}
                  value={settings?.socialLinks?.[k] || ''}
                  onChange={e => setSocial(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Notification toggles */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Notifications</h2>
          <div className="space-y-3">
            {[
              ['emailNotifications', 'Email Notifications'],
              ['smsNotifications', 'SMS Notifications'],
              ['pushNotifications', 'Push Notifications (Firebase)'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <button type="button"
                  onClick={() => set(key, !settings?.[key])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.[key] ? 'bg-primary-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings?.[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-8" disabled={saving}>
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
