import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Modal, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { ArrowsRightLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const statusBadge = (s) => {
  const m = { active: 'badge-blue', returned: 'badge-green', overdue: 'badge-red', reserved: 'badge-yellow', cancelled: 'badge-gray', expired: 'badge-gray' };
  return `badge ${m[s] || 'badge-gray'}`;
};

export default function ManageCirculation() {
  const [circulations, setCirculations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [issueModal, setIssueModal] = useState(false);
  const [reserveModal, setReserveModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ bookId: '', memberId: '' });
  const [saving, setSaving] = useState(false);
   // ✅ ADDED HERE 
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);

  // useEffect(() => { fetchCirculations(); }, [page, typeFilter, statusFilter]);

  useEffect(() => {
  fetchCirculations();

  // ✅ NEW: load dropdown data
      api.get('/books?limit=100')
        .then(res => setBooks(res.data.books))
        .catch(() => toast.error('Books load failed'));

      api.get('/users?role=member')
        .then(res => setMembers(res.data.users))
        .catch(() => toast.error('Members load failed'));

    }, [page, typeFilter, statusFilter]);

  const fetchCirculations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/circulation?${params}`);
      setCirculations(data.circulations);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/circulation/issue', issueForm);
      toast.success('Book issued successfully!');
      setIssueModal(false);
      setIssueForm({ bookId: '', memberId: '' });
      fetchCirculations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Issue failed');
    } finally { setSaving(false); }
  };

  const handleReturn = async (id) => {
    try {
      const { data } = await api.put(`/circulation/return/${id}`);
      toast.success(`Book returned. Fine: $${(data.fine || 0).toFixed(2)}`);
      fetchCirculations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Circulation</h1>
        <div className="flex gap-2">
          <button onClick={() => setReserveModal(true)} className="btn-secondary text-sm">+ Reserve</button>
          <button onClick={() => setIssueModal(true)} className="btn-primary text-sm flex items-center space-x-1">
            <ArrowsRightLeftIcon className="h-4 w-4" /><span>Issue Book</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input w-36">
          <option value="">All Types</option>
          <option value="issue">Issue</option>
          <option value="reservation">Reservation</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input w-40">
          <option value="">All Statuses</option>
          {['active', 'returned', 'overdue', 'reserved', 'cancelled', 'expired'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : circulations.length === 0 ? (
        <EmptyState icon={ArrowsRightLeftIcon} title="No circulation records" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Book', 'Member', 'Type', 'Status', 'Issue Date', 'Due / Expiry', 'Fine', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {circulations.map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="td font-medium max-w-[180px]">
                    <div className="truncate">{c.book?.title}</div>
                    <div className="text-xs text-gray-400">{c.book?.isbn}</div>
                  </td>
                  <td className="td">
                    <div className="text-sm">{c.member?.name}</div>
                    <div className="text-xs text-gray-400">{c.member?.email}</div>
                  </td>
                  <td className="td"><span className="badge badge-gray capitalize">{c.type}</span></td>
                  <td className="td"><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td className="td text-xs text-gray-500">
                    {c.issueDate ? format(new Date(c.issueDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="td text-xs text-gray-500">
                    {c.dueDate ? format(new Date(c.dueDate), 'MMM d, yyyy') :
                     c.reservationExpiry ? format(new Date(c.reservationExpiry), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="td text-xs">
                    {c.fine > 0 ? (
                      <span className={c.finePaid ? 'text-green-600' : 'text-red-600'}>
                        ${c.fine.toFixed(2)} {c.finePaid ? '(paid)' : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="td">
                    {['active', 'overdue'].includes(c.status) && c.type === 'issue' && (
                      <button onClick={() => handleReturn(c._id)}
                        className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 font-medium">
                        <CheckIcon className="h-4 w-4" /><span>Return</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{pagination.total} records</div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />

      {/* Issue Modal */}
      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue Book to Member" size="sm">
        <form onSubmit={handleIssue} className="space-y-4">
          <div>
            <label className="label">Book ID</label>
            <select
                className="input"
                value={issueForm.bookId}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, bookId: e.target.value })
                }
                required
              >
                <option value="">Select Book</option>
                {books.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title}
                  </option>
                ))}
              </select>
             
              value={issueForm.bookId} onChange={e => setIssueForm({ ...issueForm, bookId: e.target.value.trim() })} />
            <p className="text-xs text-gray-400 mt-1">Tip: Copy from the Books table</p>
          </div>
          <div>
            <label className="label">Member ID</label>
            <select
                className="input"
                value={issueForm.memberId}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, memberId: e.target.value })
                }
                required
              >
                <option value="">Select Member</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
      
             value={issueForm.memberId} onChange={e => setIssueForm({ ...issueForm, memberId: e.target.value.trim() })} />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setIssueModal(false)} className="btn-secondary">Cancel</button>
            {/*<button type="submit" className="btn-primary" disabled={saving}>*/}
            <button
                type="submit"
                className="btn-primary"
                disabled={saving || !issueForm.bookId || !issueForm.memberId}
              >
              {saving ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reserve Modal */}
      <Modal open={reserveModal} onClose={() => setReserveModal(false)} title="Reserve Book for Member" size="sm">
        <ReserveForm onClose={() => { setReserveModal(false); fetchCirculations(); }} />
      </Modal>
    </div>
  );
}

function ReserveForm({ onClose }) {
  const [form, setForm] = useState({ bookId: '', memberId: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/circulation/reserve', form);
      toast.success('Reserved successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reserve failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Book ID</label>
        <input className="input" required value={form.bookId} onChange={e => setForm({ ...form, bookId: e.target.value })} />
      </div>
      <div>
        <label className="label">Member ID</label>
        <input className="input" required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Reserving...' : 'Reserve'}</button>
      </div>
    </form>
  );
}
