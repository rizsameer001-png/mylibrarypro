import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import CloudinaryUploader from '../../components/ui/CloudinaryUploader';
import { getImageUrl, imgOnError } from '../../utils/image';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, StarIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const EMPTY = {
  name:'', shortBio:'', fullBio:'', nationality:'', birthYear:'', deathYear:'',
  genres:'', languages:'', avatar:'', avatarPublicId:'',
  isFeatured: false, isActive: true,
  youtubeLinks:[], audioLinks:[], articles:[], timeline:[], multiBio:[],
};

// ── Small inline list editor ──────────────────────────────────────────────────
function ListEditor({ label, items, setItems, fields }) {
  const addItem = () => setItems([...items, Object.fromEntries(fields.map(f => [f.key, '']))]);
  const remove  = (i) => setItems(items.filter((_, idx) => idx !== i));
  const update  = (i, key, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">{label}</label>
        <button type="button" onClick={addItem}
          className="text-xs text-primary-600 hover:underline flex items-center space-x-0.5">
          <PlusIcon className="h-3 w-3" /><span>Add</span>
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1 grid grid-cols-1 gap-1.5">
              {fields.map(f => (
                <div key={f.key}>
                  <input
                    className="input text-xs py-1"
                    placeholder={f.label}
                    value={item[f.key] || ''}
                    onChange={e => update(i, f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600 mt-1 flex-shrink-0">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 italic">None added yet</p>}
      </div>
    </div>
  );
}

export default function ManageAuthors() {
  const [authors, setAuthors]       = useState([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editAuthor, setEditAuthor] = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [activeTab, setActiveTab]   = useState('basic');

  useEffect(() => { fetchAuthors(); }, [search, page]);

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 20 });
      if (search) p.set('search', search);
      const { data } = await api.get(`/authors?${p}`);
      setAuthors(data.authors);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load authors'); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditAuthor(null);
    setForm(EMPTY);
    setActiveTab('basic');
    setModalOpen(true);
  };

  const openEdit = (author) => {
    setEditAuthor(author);
    setForm({
      name:       author.name || '',
      shortBio:   author.shortBio || '',
      fullBio:    author.fullBio || '',
      nationality: author.nationality || '',
      birthYear:  author.birthYear || '',
      deathYear:  author.deathYear || '',
      genres:     author.genres?.join(', ') || '',
      languages:  author.languages?.join(', ') || '',
      avatar:     author.avatar || '',
      avatarPublicId: author.avatarPublicId || '',
      isFeatured: author.isFeatured || false,
      isActive:   author.isActive !== false,
      youtubeLinks: author.youtubeLinks || [],
      audioLinks:   author.audioLinks   || [],
      articles:     author.articles     || [],
      timeline:     author.timeline     || [],
      multiBio:     author.multiBio     || [],
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        youtubeLinks: form.youtubeLinks,
        audioLinks:   form.audioLinks,
        articles:     form.articles,
        timeline:     form.timeline,
        multiBio:     form.multiBio,
      };
      if (editAuthor) {
        const { data } = await api.put(`/authors/${editAuthor._id}`, payload);
        setAuthors(prev => prev.map(a => a._id === editAuthor._id ? data.author : a));
        toast.success('Author updated');
      } else {
        const { data } = await api.post('/authors', payload);
        setAuthors(prev => [data.author, ...prev]);
        toast.success('Author created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/authors/${deleteId}`);
      setAuthors(prev => prev.filter(a => a._id !== deleteId));
      toast.success('Author deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const toggleFeatured = async (author) => {
    try {
      const { data } = await api.put(`/authors/${author._id}/toggle-featured`);
      setAuthors(prev => prev.map(a => a._id === author._id ? { ...a, isFeatured: data.isFeatured } : a));
      toast.success(data.isFeatured ? 'Marked as Featured' : 'Removed from Featured');
    } catch { toast.error('Failed'); }
  };

  const formTabs = [
    { key:'basic',    label:'Basic Info' },
    { key:'bio',      label:'Biography' },
    { key:'media',    label:'Media & Links' },
    { key:'timeline', label:'Timeline' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Authors</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4" /><span>Add Author</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search authors…" className="input pl-9" />
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : authors.length === 0 ? (
        <EmptyState title="No authors found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Author','Nationality','Genres','Books','Featured','Status','Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {authors.map(author => (
                <tr key={author._id} className="hover:bg-gray-50">
                  <td className="td">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        <img src={getImageUrl(author.avatar)} alt={author.name}
                          className="h-full w-full object-cover object-top" onError={imgOnError} loading="lazy" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{author.name}</p>
                        {author.slug && <p className="text-xs text-gray-400">/authors/{author.slug}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="td text-sm text-gray-500">{author.nationality || '—'}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {author.genres?.slice(0,2).map(g => (
                        <span key={g} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">{g}</span>
                      ))}
                    </div>
                  </td>
                  <td className="td text-center text-sm">{author.bookCount || 0}</td>
                  <td className="td text-center">
                    <button onClick={() => toggleFeatured(author)}
                      className={`transition-colors ${author.isFeatured ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}>
                      {author.isFeatured ? <StarSolid className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="td">
                    <span className={`badge ${author.isActive !== false ? 'badge-green' : 'badge-red'}`}>
                      {author.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => openEdit(author)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(author._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{pagination.total} authors</div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editAuthor ? `Edit: ${editAuthor.name}` : 'Add New Author'} size="xl">
        <form onSubmit={handleSave}>
          {/* Tab nav */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-5 overflow-x-auto">
            {formTabs.map(t => (
              <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Full Name *</label>
                  <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Nationality</label>
                  <input className="input" value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. British" />
                </div>
                <div>
                  <label className="label">Birth Year</label>
                  <input type="number" className="input" value={form.birthYear} onChange={e => set('birthYear', e.target.value)} placeholder="e.g. 1797" />
                </div>
                <div>
                  <label className="label">Death Year <span className="text-gray-400 font-normal">(leave blank if living)</span></label>
                  <input type="number" className="input" value={form.deathYear} onChange={e => set('deathYear', e.target.value)} placeholder="e.g. 1856" />
                </div>
                <div>
                  <label className="label">Genres <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input className="input" value={form.genres} onChange={e => set('genres', e.target.value)} placeholder="Poetry, Fiction, Drama" />
                </div>
                <div>
                  <label className="label">Languages Written In</label>
                  <input className="input" value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="Urdu, Persian, English" />
                </div>
              </div>

              {/* Avatar */}
              <div>
                <label className="label">Profile Photo</label>
                <CloudinaryUploader
                  folder="lms/authors"
                  resourceType="image"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={false}
                  showUrlInput
                  currentUrl={form.avatar}
                  onRemove={() => set('avatar', '')}
                  onUploaded={results => {
                    set('avatar', results[0].secureUrl);
                    set('avatarPublicId', results[0].publicId);
                  }}
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)}
                    className="rounded text-primary-600" />
                  <span className="text-sm text-gray-700">Featured Author</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                    className="rounded text-primary-600" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          )}

          {/* Biography */}
          {activeTab === 'bio' && (
            <div className="space-y-4">
              <div>
                <label className="label">Short Bio <span className="text-gray-400 font-normal">(shown on cards, ~150 chars)</span></label>
                <textarea className="input" rows={2} value={form.shortBio} onChange={e => set('shortBio', e.target.value)}
                  placeholder="A brief description shown on the author card…" maxLength={300} />
                <p className="text-xs text-gray-400 mt-1">{form.shortBio.length}/300</p>
              </div>
              <div>
                <label className="label">Full Biography</label>
                <textarea className="input" rows={8} value={form.fullBio} onChange={e => set('fullBio', e.target.value)}
                  placeholder="Full biography shown on the author profile page…" />
              </div>
              {/* Multi-language bios */}
              <ListEditor
                label="Multi-Language Biographies"
                items={form.multiBio}
                setItems={v => set('multiBio', v)}
                fields={[
                  { key:'lang', label:'Language code (e.g. ur, hi, fr)' },
                  { key:'bio',  label:'Biography in that language' },
                ]}
              />
            </div>
          )}

          {/* Media & Links */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <ListEditor
                label="YouTube Videos"
                items={form.youtubeLinks}
                setItems={v => set('youtubeLinks', v)}
                fields={[
                  { key:'title', label:'Video title' },
                  { key:'url',   label:'YouTube URL (https://youtube.com/...)' },
                ]}
              />
              <ListEditor
                label="Audio Links"
                items={form.audioLinks}
                setItems={v => set('audioLinks', v)}
                fields={[
                  { key:'title',    label:'Audio title' },
                  { key:'url',      label:'Audio URL' },
                  { key:'duration', label:'Duration (e.g. 12:34)' },
                ]}
              />
              <ListEditor
                label="Related Articles"
                items={form.articles}
                setItems={v => set('articles', v)}
                fields={[
                  { key:'title',  label:'Article title' },
                  { key:'url',    label:'Article URL' },
                  { key:'source', label:'Source name (e.g. Wikipedia)' },
                ]}
              />
            </div>
          )}

          {/* Timeline */}
          {activeTab === 'timeline' && (
            <ListEditor
              label="Life Timeline Events"
              items={form.timeline}
              setItems={v => set('timeline', v)}
              fields={[
                { key:'year',        label:'Year (e.g. 1857)' },
                { key:'event',       label:'Event title (e.g. Born in Agra)' },
                { key:'description', label:'Short description (optional)' },
              ]}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-5 mt-5 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editAuthor ? 'Update Author' : 'Create Author'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Author" message="Delete this author permanently? This cannot be undone." danger />
    </div>
  );
}
