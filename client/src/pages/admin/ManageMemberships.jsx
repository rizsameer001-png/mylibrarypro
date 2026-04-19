import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const EMPTY = { name: '', description: '', duration: 30, borrowingLimit: 3, ebookAccess: false, price: 0 };

export default function ManageMemberships() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    api.get('/memberships')
      .then(({ data }) => setPlans(data.plans))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditPlan(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (p) => { setEditPlan(p); setForm({ name: p.name, description: p.description || '', duration: p.duration, borrowingLimit: p.borrowingLimit, ebookAccess: p.ebookAccess, price: p.price }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editPlan) {
        const { data } = await api.put(`/memberships/${editPlan._id}`, form);
        setPlans(prev => prev.map(p => p._id === editPlan._id ? data.plan : p));
        toast.success('Plan updated');
      } else {
        const { data } = await api.post('/memberships', form);
        setPlans(prev => [...prev, data.plan]);
        toast.success('Plan created');
      }
      setModalOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/memberships/${deleteId}`);
      setPlans(prev => prev.filter(p => p._id !== deleteId));
      toast.success('Plan deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
          <PlusIcon className="h-4 w-4" /><span>Add Plan</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={CreditCardIcon} title="No plans found" description="Create your first membership plan" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div key={plan._id} className="card relative border-2 border-gray-100 hover:border-primary-200 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => openEdit(plan)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(plan._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-3xl font-bold text-primary-600 mb-4">
                ${plan.price}<span className="text-sm font-normal text-gray-500">/plan</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>{plan.duration} days duration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Borrow up to {plan.borrowingLimit} books</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className={plan.ebookAccess ? 'text-green-500' : 'text-gray-300'}>
                    {plan.ebookAccess ? '✓' : '✗'}
                  </span>
                  <span className={plan.ebookAccess ? '' : 'text-gray-400'}>E-book access</span>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPlan ? 'Edit Plan' : 'Create Membership Plan'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Plan Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration (days)</label>
              <input type="number" min="1" className="input" value={form.duration}
                onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="label">Borrow Limit</label>
              <input type="number" min="1" className="input" value={form.borrowingLimit}
                onChange={e => setForm({ ...form, borrowingLimit: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.price}
                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="ebookAccess" checked={form.ebookAccess}
              onChange={e => setForm({ ...form, ebookAccess: e.target.checked })} className="rounded" />
            <label htmlFor="ebookAccess" className="text-sm text-gray-700">Include E-book access</label>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Plan'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Plan" message="Are you sure you want to delete this membership plan?" danger />
    </div>
  );
}
