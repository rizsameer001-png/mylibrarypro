import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('categories');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, a, p] = await Promise.all([
        api.get('/categories'), api.get('/authors'), api.get('/publishers')
      ]);
      setCategories(c.data.categories);
      setAuthors(a.data.authors);
      setPublishers(p.data.publishers);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const endpoint = { categories: '/categories', authors: '/authors', publishers: '/publishers' }[tab];
  const items = { categories, authors, publishers }[tab];
  const setItems = { categories: setCategories, authors: setAuthors, publishers: setPublishers }[tab];

  const openCreate = () => { setEditItem(null); setForm({ name: '', description: '', icon: '' }); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, description: item.description || '', icon: item.icon || '' }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        const { data } = await api.put(`${endpoint}/${editItem._id}`, form);
        const key = Object.keys(data).find(k => k !== 'success');
        setItems(prev => prev.map(i => i._id === editItem._id ? data[key] : i));
        toast.success('Updated');
      } else {
        const { data } = await api.post(endpoint, form);
        const key = Object.keys(data).find(k => k !== 'success');
        setItems(prev => [...prev, data[key]]);
        toast.success('Created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`${endpoint}/${deleteTarget}`);
      setItems(prev => prev.filter(i => i._id !== deleteTarget));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteTarget(null); }
  };

  const tabs = [
    { key: 'categories', label: 'Categories' },
    { key: 'authors', label: 'Authors' },
    { key: 'publishers', label: 'Publishers' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Metadata Management</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4" /><span>Add {tab.slice(0, -1)}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label} ({({ categories, authors, publishers }[t.key])?.length || 0})
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : items?.length === 0 ? (
        <EmptyState icon={TagIcon} title={`No ${tab} found`} description={`Add your first ${tab.slice(0, -1)} to get started`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items?.map(item => (
            <div key={item._id} className="card flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                {item.icon && <span className="text-2xl">{item.icon}</span>}
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                  {item.nationality && <p className="text-xs text-gray-400">{item.nationality}</p>}
                  {item.website && <p className="text-xs text-gray-400 truncate max-w-[150px]">{item.website}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(item._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={`${editItem ? 'Edit' : 'Add'} ${tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}`} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          {tab === 'categories' && (
            <div>
              <label className="label">Icon (emoji)</label>
              <input className="input" placeholder="e.g. 📚" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Item" message="Are you sure you want to delete this item?" danger />
    </div>
  );
}
