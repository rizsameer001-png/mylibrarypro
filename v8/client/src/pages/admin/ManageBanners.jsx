import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner } from '../../components/ui/index';
import CloudinaryUploader from '../../components/ui/CloudinaryUploader';
import { getImageUrl, imgOnError } from '../../utils/image';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const PLACEMENTS = ['home_hero','home_middle','home_bottom','books_top','book_detail','sidebar'];
const EMPTY = { title:'', subtitle:'', linkUrl:'', linkText:'Learn More', placement:'home_hero', bgColor:'#1e40af', textColor:'#ffffff', isActive:true, imageUrl:'', imagePublicId:'', order:0 };

export default function ManageBanners() {
  const [banners, setBanners]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    api.get('/banners/all')
      .then(({ data }) => setBanners(data.banners||[]))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditBanner(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit   = (b) => { setEditBanner(b); setForm({ ...EMPTY, ...b }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editBanner) {
        const { data } = await api.put(`/banners/${editBanner._id}`, form);
        setBanners(prev => prev.map(b => b._id===editBanner._id ? data.banner : b));
        toast.success('Banner updated');
      } else {
        const { data } = await api.post('/banners', form);
        setBanners(prev => [data.banner, ...prev]);
        toast.success('Banner created');
      }
      setModalOpen(false);
    } catch (err) { toast.error(err.response?.data?.message||'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/banners/${deleteId}`);
      setBanners(prev => prev.filter(b => b._id!==deleteId));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const toggleActive = async (b) => {
    const { data } = await api.put(`/banners/${b._id}`, { isActive: !b.isActive });
    setBanners(prev => prev.map(x => x._id===b._id ? data.banner : x));
  };

  if (loading) return <LoadingSpinner/>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Banners & Ads</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4"/><span>Add Banner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(b => (
          <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Preview */}
            <div className="h-24 relative flex items-center px-5" style={{ backgroundColor: b.bgColor||'#1e40af' }}>
              {b.imageUrl && (
                <img src={getImageUrl(b.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" onError={imgOnError}/>
              )}
              <div className="relative z-10">
                <p className="font-bold text-sm" style={{ color: b.textColor||'#fff' }}>{b.title}</p>
                {b.subtitle && <p className="text-xs opacity-80" style={{ color: b.textColor||'#fff' }}>{b.subtitle}</p>}
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="badge badge-blue text-xs">{b.placement}</span>
                <span className={`ml-2 badge text-xs ${b.isActive?'badge-green':'badge-red'}`}>{b.isActive?'Active':'Inactive'}</span>
                <p className="text-xs text-gray-400 mt-1">{b.clickCount||0} clicks</p>
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => toggleActive(b)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">
                  {b.isActive?'Pause':'Activate'}
                </button>
                <button onClick={() => openEdit(b)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                  <PencilIcon className="h-4 w-4"/>
                </button>
                <button onClick={() => setDeleteId(b._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="h-4 w-4"/>
                </button>
              </div>
            </div>
          </div>
        ))}
        {banners.length===0 && <p className="text-gray-400 col-span-2 text-center py-10">No banners yet. Create one!</p>}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editBanner?'Edit Banner':'New Banner'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={e=>set('title',e.target.value)}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Subtitle</label>
              <input className="input" value={form.subtitle} onChange={e=>set('subtitle',e.target.value)}/>
            </div>
            <div>
              <label className="label">Placement</label>
              <select className="input" value={form.placement} onChange={e=>set('placement',e.target.value)}>
                {PLACEMENTS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Order</label>
              <input type="number" className="input" value={form.order} onChange={e=>set('order',parseInt(e.target.value)||0)}/>
            </div>
            <div>
              <label className="label">Link URL</label>
              <input className="input" value={form.linkUrl} onChange={e=>set('linkUrl',e.target.value)} placeholder="https://..."/>
            </div>
            <div>
              <label className="label">Link Text</label>
              <input className="input" value={form.linkText} onChange={e=>set('linkText',e.target.value)}/>
            </div>
            <div>
              <label className="label">Background Color</label>
              <div className="flex space-x-2">
                <input type="color" value={form.bgColor} onChange={e=>set('bgColor',e.target.value)}
                  className="h-10 w-12 rounded border border-gray-300 cursor-pointer"/>
                <input className="input flex-1" value={form.bgColor} onChange={e=>set('bgColor',e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="label">Text Color</label>
              <div className="flex space-x-2">
                <input type="color" value={form.textColor} onChange={e=>set('textColor',e.target.value)}
                  className="h-10 w-12 rounded border border-gray-300 cursor-pointer"/>
                <input className="input flex-1" value={form.textColor} onChange={e=>set('textColor',e.target.value)}/>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)} className="rounded"/>
              <label className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div>
            <label className="label">Banner Image</label>
            <CloudinaryUploader folder="lms/banners" resourceType="image" accept="image/*"
              multiple={false} showUrlInput currentUrl={form.imageUrl}
              onRemove={()=>set('imageUrl','')}
              onUploaded={r=>{set('imageUrl',r[0].secureUrl);set('imagePublicId',r[0].publicId);}}/>
          </div>
          <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':'Save Banner'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Banner" message="Delete this banner permanently?" danger/>
    </div>
  );
}
