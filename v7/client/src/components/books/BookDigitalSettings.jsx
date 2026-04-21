import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ArrowUpTrayIcon, EyeIcon, ShoppingCartIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import BookContentEditor from '../reader/BookContentEditor';

export default function BookDigitalSettings({ book, onUpdated, onClose }) {
  const { formatPrice, currency } = useCurrency();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [settings, setSettings] = useState({
    readingEnabled:     book.readingEnabled     ?? false,
    readingAccessLevel: book.readingAccessLevel ?? 'member',
    isDigitalSale:      book.isDigitalSale      ?? false,
    digitalPrice:       book.digitalPrice       ?? 0,
    watermarkEnabled:   book.watermarkEnabled   ?? true,
    downloadEnabled:    book.downloadEnabled    ?? false,
  });

  // Track local upload state separately from book prop
  const [uploadedInfo, setUploadedInfo] = useState(
    book.cloudinaryPublicId
      ? { uploaded: true, pageCount: book.readingPageCount }
      : null
  );

  const set = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  const hasFile = !!(uploadedInfo?.uploaded || book.cloudinaryPublicId || book.ebookFile);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate format
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'epub', 'mobi'].includes(ext)) {
      toast.error('Only PDF, EPUB, or MOBI files allowed');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading to Cloudinary…');
    const fd = new FormData();
    fd.append('ebook', file);

    try {
      const { data } = await api.post(`/digital/${book._id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          const pct = Math.round((p.loaded / p.total) * 100);
          setUploadProgress(`Uploading… ${pct}%`);
        },
      });
      setUploadedInfo({ uploaded: true, pageCount: data.pageCount });
      toast.success(`✅ ${file.name} uploaded${data.pageCount ? ` (${data.pageCount} pages)` : ''}`);
      onUpdated?.({ ...book, cloudinaryPublicId: data.publicId, readingPageCount: data.pageCount });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress('');
      e.target.value = '';
    }
  };

  // ── Save settings ──────────────────────────────────────────────────────────
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

  // ── Toggle (with static Tailwind classes only) ─────────────────────────────
  const Toggle = ({ value, onChange, label, description, color = 'blue' }) => {
    const trackOn  = color === 'green' ? 'bg-green-600' : color === 'yellow' ? 'bg-yellow-500' : 'bg-primary-600';
    const trackOff = 'bg-gray-200';
    return (
      <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
        <div className="flex-1 pr-4">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <button type="button" onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${value ? trackOn : trackOff}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {/* ── File upload ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Digital File (PDF / EPUB / MOBI)</h3>
            {hasFile ? (
              <p className="text-xs text-green-600 mt-0.5">
                ✅ File uploaded{uploadedInfo?.pageCount ? ` · ${uploadedInfo.pageCount} pages` : (book.readingPageCount ? ` · ${book.readingPageCount} pages` : '')}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-0.5">⚠️ No file uploaded yet</p>
            )}
          </div>
          <label className={`flex-shrink-0 btn-primary text-xs px-3 py-2 flex items-center space-x-1.5 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            <span>{uploading ? uploadProgress || 'Uploading…' : hasFile ? 'Replace File' : 'Upload File'}</span>
            <input type="file" accept=".pdf,.epub,.mobi" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {uploading && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {!hasFile && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Upload a file first before enabling reading or sale features.
          </p>
        )}
      </div>

      {/* ── Reading ───────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center space-x-2">
          <EyeIcon className="h-4 w-4 text-primary-600" /><span>Online Reading</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4">
          <Toggle
            value={settings.readingEnabled}
            onChange={v => set('readingEnabled', v)}
            label="Enable Online Reading"
            description="Members can read this book in the browser"
          />
          {settings.readingEnabled && (
            <div className="py-3 border-t border-gray-100">
              <label className="label text-xs">Who can read online?</label>
              <select className="input mt-1" value={settings.readingAccessLevel}
                onChange={e => set('readingAccessLevel', e.target.value)}>
                <option value="any">Everyone (including guests)</option>
                <option value="member">Registered members only</option>
                <option value="premium">Premium members only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Download ─────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center space-x-2">
          <ShoppingCartIcon className="h-4 w-4 text-yellow-600" /><span>Download & Sale</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4">
          <Toggle
            value={settings.downloadEnabled}
            onChange={v => set('downloadEnabled', v)}
            label="Allow Free Download"
            description="Members can download without purchasing"
          />
          <Toggle
            value={settings.isDigitalSale}
            onChange={v => set('isDigitalSale', v)}
            label="Sell as paid download"
            description="Set a price — members must purchase before downloading"
            color="yellow"
          />
          {settings.isDigitalSale && (
            <div className="py-3 border-t border-gray-100">
              <label className="label text-xs">Price ({currency})</label>
              <input type="number" step="0.01" min="0" className="input max-w-[140px] mt-1"
                value={settings.digitalPrice}
                onChange={e => set('digitalPrice', parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-gray-400 mt-1">Preview: {formatPrice(settings.digitalPrice)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Protection ───────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center space-x-2">
          <ShieldCheckIcon className="h-4 w-4 text-green-600" /><span>File Protection</span>
        </h3>
        <div className="bg-white border border-gray-100 rounded-xl px-4">
          <Toggle
            value={settings.watermarkEnabled}
            onChange={v => set('watermarkEnabled', v)}
            label="PDF Watermarking"
            description="Embed buyer's email on every page before download"
            color="green"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">
          Download links expire after a few minutes and cannot be publicly shared.
        </p>
      </div>

      {/* ── Text content for TTS reader ──────────────────────────────────────── */}
      <div>
        <button type="button" onClick={() => setShowContent(!showContent)}
          className="flex items-center space-x-2 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors">
          <DocumentTextIcon className="h-4 w-4" />
          <span>{showContent ? '▲ Hide' : '▼ Show'} Page-by-Page Text Content</span>
          <span className="text-xs text-gray-400 font-normal">(for TTS read-aloud)</span>
        </button>
        {showContent && book._id && (
          <div className="mt-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <BookContentEditor bookId={book._id} onSaved={() => {}} />
          </div>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
