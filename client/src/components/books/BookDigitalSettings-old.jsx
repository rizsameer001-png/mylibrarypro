/**
 * BookDigitalSettings  (admin panel sub-component)
 * Shown inside ManageBooks as a modal panel when admin clicks "Digital Settings".
 * Controls:
 *  - Upload digital file (PDF/EPUB) to S3
 *  - Toggle in-browser reading on/off
 *  - Set reading access level (any / member / premium)
 *  - Toggle paid PDF sale + price
 *  - Watermark on/off
 *  - Max downloads
 */
import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon, EyeIcon, ShoppingCartIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function BookDigitalSettings({ book, onUpdated, onClose }) {
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [settings, setSettings]     = useState({
    readingEnabled:     book.readingEnabled     ?? false,
    readingAccessLevel: book.readingAccessLevel ?? 'member',
    isDigitalSale:      book.isDigitalSale      ?? false,
    digitalPrice:       book.digitalPrice       ?? 0,
    watermarkEnabled:   book.watermarkEnabled   ?? true,
  });

  const set = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  // ── Upload digital file ──────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('ebook', file);
    try {
      const { data } = await api.post(`/digital/${book._id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`File uploaded — ${data.pageCount ? data.pageCount + ' pages' : 'OK'}`);
      onUpdated?.({ ...book, digitalFileKey: data.s3Key, readingPageCount: data.pageCount });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  // ── Save settings ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/digital/${book._id}/reading-settings`, settings);
      toast.success('Digital settings saved');
      onUpdated?.(data.book);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const Toggle = ({ value, onChange, label, description, icon: Icon, color = 'primary' }) => (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start space-x-3">
        {Icon && (
          <div className={`mt-0.5 p-1.5 rounded-lg bg-${color}-50`}>
            <Icon className={`h-4 w-4 text-${color}-600`} />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
          value ? `bg-${color}-600` : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── File upload ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Digital File</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {book.digitalFileKey
                ? `✅ File uploaded${book.readingPageCount ? ` · ${book.readingPageCount} pages` : ''}`
                : '⚠️ No file uploaded yet'}
            </p>
          </div>
          <label className={`btn-primary text-xs px-3 py-1.5 flex items-center space-x-1 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            <span>{uploading ? 'Uploading…' : 'Upload PDF / EPUB'}</span>
            <input type="file" accept=".pdf,.epub" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {!book.digitalFileKey && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Upload a digital file before enabling reading or sale features.
          </p>
        )}
      </div>

      {/* ── Reading settings ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center space-x-2">
          <EyeIcon className="h-4 w-4 text-primary-600" />
          <span>In-Browser Reading</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4 divide-y divide-gray-100">
          <Toggle
            value={settings.readingEnabled}
            onChange={v => set('readingEnabled', v)}
            label="Enable Online Reading"
            description="Allow members to read this book in the browser"
          />
          {settings.readingEnabled && (
            <div className="py-3">
              <label className="label text-xs">Who can read?</label>
              <select
                className="input mt-1"
                value={settings.readingAccessLevel}
                onChange={e => set('readingAccessLevel', e.target.value)}
              >
                <option value="any">Anyone (including guests)</option>
                <option value="member">Registered Members</option>
                <option value="premium">Premium Members only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Sale settings ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center space-x-2">
          <ShoppingCartIcon className="h-4 w-4 text-accent-600" />
          <span>PDF Sale</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4 divide-y divide-gray-100">
          <Toggle
            value={settings.isDigitalSale}
            onChange={v => set('isDigitalSale', v)}
            label="Sell this book"
            description="Members can purchase and download this PDF"
            icon={ShoppingCartIcon}
            color="accent"
          />
          {settings.isDigitalSale && (
            <div className="py-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Price ($)</label>
                <input
                  type="number" step="0.01" min="0" className="input"
                  value={settings.digitalPrice}
                  onChange={e => set('digitalPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Protection ───────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center space-x-2">
          <ShieldCheckIcon className="h-4 w-4 text-green-600" />
          <span>File Protection</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4">
          <Toggle
            value={settings.watermarkEnabled}
            onChange={v => set('watermarkEnabled', v)}
            label="PDF Watermarking"
            description="Add buyer's email to each page footer before download to discourage piracy"
            icon={ShieldCheckIcon}
            color="green"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">
           Signed download URLs expire in {import.meta.env.VITE_SIGNED_URL_EXPIRES || '300'} seconds and cannot be shared.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Digital Settings'}
        </button>
      </div>
    </div>
  );
}
