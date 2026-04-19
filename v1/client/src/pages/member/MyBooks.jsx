import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const statusBadge = (status) => {
  const map = { active: 'badge-blue', returned: 'badge-green', overdue: 'badge-red', reserved: 'badge-yellow', cancelled: 'badge-gray', expired: 'badge-gray' };
  return map[status] || 'badge-gray';
};

export default function MyBooks() {
  const [circulations, setCirculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    api.get('/circulation/my')
      .then(({ data }) => setCirculations(data.circulations))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    try {
      await api.put(`/circulation/reserve/${id}/cancel`);
      setCirculations(prev => prev.map(c => c._id === id ? { ...c, status: 'cancelled' } : c));
      toast.success('Reservation cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const filtered = circulations.filter(c => {
    if (tab === 'issued') return c.type === 'issue' && ['active', 'overdue'].includes(c.status);
    if (tab === 'reserved') return c.type === 'reservation' && c.status === 'reserved';
    if (tab === 'history') return c.status === 'returned';
    return true;
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'issued', label: 'Currently Issued' },
    { key: 'reserved', label: 'Reservations' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Books</h1>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={BookOpenIcon} title="No books found" description="Your library activity will appear here" />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const book = c.book;
            const cover = book?.coverImage ? `/${book.coverImage}` : null;
            return (
              <div key={c._id} className="card flex items-center space-x-4">
                <div className="h-16 w-12 flex-shrink-0 bg-primary-50 rounded-lg overflow-hidden flex items-center justify-center">
                  {cover ? <img src={cover} alt={book?.title} className="h-full w-full object-cover" />
                    : <BookOpenIcon className="h-7 w-7 text-primary-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{book?.title}</p>
                  <p className="text-xs text-gray-500">{book?.isbn}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`badge ${statusBadge(c.status)} capitalize`}>{c.status}</span>
                    <span className="badge badge-gray capitalize">{c.type}</span>
                    {c.dueDate && <span className="text-xs text-gray-400">Due: {format(new Date(c.dueDate), 'MMM d, yyyy')}</span>}
                    {c.reservationExpiry && <span className="text-xs text-gray-400">Expires: {format(new Date(c.reservationExpiry), 'MMM d, yyyy')}</span>}
                    {c.fine > 0 && <span className="text-xs text-red-600 font-medium">Fine: ${c.fine.toFixed(2)}</span>}
                  </div>
                </div>
                {c.type === 'reservation' && c.status === 'reserved' && (
                  <button onClick={() => handleCancel(c._id)} className="btn-secondary text-xs px-3 py-1.5 text-red-600 border-red-200 hover:bg-red-50">
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
