import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function ManagePenalties() {
  const [rules, setRules] = useState({ perDayFine: 1, gracePeriodDays: 0, maxFineAmount: 100, currency: 'USD' });
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/penalties/rules'),
      api.get('/penalties/outstanding'),
    ]).then(([r, f]) => {
      setRules(r.data.rule);
      setFines(f.data.fines);
    }).catch(() => toast.error('Failed to load'))
    .finally(() => setLoading(false));
  }, []);

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/penalties/rules', rules);
      toast.success('Penalty rules updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.put(`/penalties/${id}/pay`);
      setFines(prev => prev.filter(f => f._id !== id));
      toast.success('Fine marked as paid');
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Penalty & Fine Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Fine Rules</h2>
          <form onSubmit={handleSaveRules} className="space-y-4">
            <div>
              <label className="label">Per Day Fine ({rules.currency})</label>
              <input type="number" step="0.01" min="0" className="input"
                value={rules.perDayFine}
                onChange={e => setRules({ ...rules, perDayFine: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="label">Grace Period (days)</label>
              <input type="number" min="0" className="input"
                value={rules.gracePeriodDays}
                onChange={e => setRules({ ...rules, gracePeriodDays: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="label">Max Fine Amount</label>
              <input type="number" step="0.01" min="0" className="input"
                value={rules.maxFineAmount}
                onChange={e => setRules({ ...rules, maxFineAmount: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={rules.currency}
                onChange={e => setRules({ ...rules, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
          </form>
        </div>

        {/* Outstanding Fines */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-900 mb-4">Outstanding Fines ({fines.length})</h2>
          {fines.length === 0 ? (
            <EmptyState icon={ExclamationTriangleIcon} title="No outstanding fines" description="All fines have been paid" />
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {fines.map(f => (
                <div key={f._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.book?.title}</p>
                    <p className="text-xs text-gray-500">{f.member?.name} · {f.member?.email}</p>
                    {f.dueDate && <p className="text-xs text-red-500 mt-0.5">Due: {format(new Date(f.dueDate), 'MMM d, yyyy')}</p>}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-red-600 font-semibold text-sm">${f.fine.toFixed(2)}</span>
                    <button onClick={() => handleMarkPaid(f._id)}
                      className="text-xs btn-primary px-3 py-1.5">Mark Paid</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
