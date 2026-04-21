import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/index';
import toast from 'react-hot-toast';

export default function ManageCMS() {
  const [cms, setCms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ name: '', role: '', comment: '', rating: 5 });
  const [addingTestimonial, setAddingTestimonial] = useState(false);

  useEffect(() => {
    api.get('/cms').then(({ data }) => setCms(data.cms)).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/cms', cms);
      setCms(data.cms);
      toast.success('CMS updated!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleAddTestimonial = async () => {
    setAddingTestimonial(true);
    try {
      const { data } = await api.post('/cms/testimonials', newTestimonial);
      setCms(data.cms);
      setNewTestimonial({ name: '', role: '', comment: '', rating: 5 });
      toast.success('Testimonial added');
    } catch { toast.error('Failed to add'); }
    finally { setAddingTestimonial(false); }
  };

  const handleDeleteTestimonial = async (index) => {
    try {
      await api.delete(`/cms/testimonials/${index}`);
      setCms(prev => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== index) }));
      toast.success('Testimonial removed');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CMS & Website Content</h1>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Hero Section</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Hero Title</label>
              <input className="input" value={cms?.heroTitle || ''}
                onChange={e => setCms({ ...cms, heroTitle: e.target.value })} />
            </div>
            <div>
              <label className="label">Hero Subtitle</label>
              <textarea className="input" rows={2} value={cms?.heroSubtitle || ''}
                onChange={e => setCms({ ...cms, heroSubtitle: e.target.value })} />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Call to Action</h2>
          <div className="space-y-3">
            <div>
              <label className="label">CTA Title</label>
              <input className="input" value={cms?.ctaTitle || ''}
                onChange={e => setCms({ ...cms, ctaTitle: e.target.value })} />
            </div>
            <div>
              <label className="label">CTA Description</label>
              <textarea className="input" rows={2} value={cms?.ctaDescription || ''}
                onChange={e => setCms({ ...cms, ctaDescription: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Testimonials ({cms?.testimonials?.length || 0})</h2>
          <div className="space-y-3 mb-6">
            {cms?.testimonials?.map((t, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium">{t.name} <span className="text-gray-400 font-normal">· {t.role}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5 italic">"{t.comment}"</p>
                  <p className="text-yellow-500 text-xs mt-1">{'★'.repeat(t.rating || 5)}</p>
                </div>
                <button onClick={() => handleDeleteTestimonial(i)} className="text-red-500 hover:text-red-700 text-xs ml-3">Remove</button>
              </div>
            ))}
            {(!cms?.testimonials?.length) && <p className="text-gray-400 text-sm">No testimonials yet.</p>}
          </div>

          {/* Add Testimonial */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Testimonial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Name</label>
                <input className="input text-sm" value={newTestimonial.name}
                  onChange={e => setNewTestimonial({ ...newTestimonial, name: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Role</label>
                <input className="input text-sm" value={newTestimonial.role}
                  onChange={e => setNewTestimonial({ ...newTestimonial, role: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs">Comment</label>
                <textarea className="input text-sm" rows={2} value={newTestimonial.comment}
                  onChange={e => setNewTestimonial({ ...newTestimonial, comment: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Rating</label>
                <select className="input text-sm" value={newTestimonial.rating}
                  onChange={e => setNewTestimonial({ ...newTestimonial, rating: parseInt(e.target.value) })}>
                  {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} stars</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAddTestimonial}
              disabled={addingTestimonial || !newTestimonial.name || !newTestimonial.comment}
              className="btn-primary mt-3 text-sm">
              {addingTestimonial ? 'Adding...' : '+ Add Testimonial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
