import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { Modal, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';
import {
  ArrowsRightLeftIcon, CheckIcon, MagnifyingGlassIcon,
  UserCircleIcon, BookOpenIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// ── Status badge helper ────────────────────────────────────────────────────────
const statusBadge = (s) => {
  const m = {
    active: 'badge-blue', returned: 'badge-green', overdue: 'badge-red',
    reserved: 'badge-yellow', cancelled: 'badge-gray', expired: 'badge-gray',
  };
  return `badge ${m[s] || 'badge-gray'}`;
};

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── SearchSelect: live-search dropdown for books or members ───────────────────
function SearchSelect({ type, value, onSelect, placeholder }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounced               = useDebounce(query, 350);
  const wrapRef                 = useRef(null);

  // Close on outside click
  useEffect(() => {
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Search API
  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return; }
    setLoading(true);
    const endpoint = type === 'member'
      ? `/users?role=member&search=${encodeURIComponent(debounced)}&limit=8`
      : `/books?search=${encodeURIComponent(debounced)}&limit=8`;
    api.get(endpoint)
      .then(({ data }) => {
        setResults(type === 'member' ? (data.users || []) : (data.books || []));
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debounced, type]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery(type === 'member' ? item.name : item.title);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          className="input pl-9 pr-8"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) onSelect(null); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selected preview */}
      {value && (
        <div className={`mt-1.5 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${type === 'member' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
          {type === 'member'
            ? <UserCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            : <BookOpenIcon   className="h-4 w-4 text-green-600 flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {type === 'member' ? value.name : value.title}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {type === 'member'
                ? value.email
                : `${value.authors?.map(a => a.name).join(', ') || ''}${value.isbn ? ' · ISBN: ' + value.isbn : ''}`
              }
            </p>
          </div>
          {type === 'book' && (
            <span className={`badge text-xs flex-shrink-0 ${(value.availableCopies || 0) > 0 ? 'badge-green' : 'badge-red'}`}>
              {(value.availableCopies || 0) > 0 ? `${value.availableCopies} avail.` : 'Unavailable'}
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {results.map(item => (
            <button
              key={item._id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              {type === 'member' ? (
                <>
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                    {item.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.email}</p>
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ${item.isActive ? 'badge-green' : 'badge-red'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </>
              ) : (
                <>
                  <div className="h-10 w-7 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {item.coverImage
                      ? <img src={item.coverImage} alt="" className="h-full w-full object-cover" />
                      : <BookOpenIcon className="h-4 w-4 text-gray-300 m-1.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.authors?.map(a => a.name).join(', ')}
                      {item.isbn ? ` · ${item.isbn}` : ''}
                    </p>
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ${(item.availableCopies || 0) > 0 ? 'badge-green' : 'badge-red'}`}>
                    {(item.availableCopies || 0) > 0 ? `${item.availableCopies} avail.` : 'None'}
                  </span>
                </>
              )}
            </button>
          ))}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No results found</div>
          )}
        </div>
      )}

      {/* Loading spinner in dropdown */}
      {open && loading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400 text-center">
          Searching…
        </div>
      )}
    </div>
  );
}

// ── IssueForm ─────────────────────────────────────────────────────────────────
function IssueForm({ onClose, onSuccess }) {
  const [selectedBook,   setSelectedBook]   = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = selectedBook && selectedMember;
  const bookUnavailable = selectedBook && (selectedBook.availableCopies || 0) < 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (bookUnavailable) { toast.error('No copies available for this book'); return; }
    setSaving(true);
    try {
      await api.post('/circulation/issue', {
        bookId:   selectedBook._id,
        memberId: selectedMember._id,
      });
      toast.success(`"${selectedBook.title}" issued to ${selectedMember.name}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Issue failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Book search */}
      <div>
        <label className="label">Search Book</label>
        <p className="text-xs text-gray-400 mb-1.5">By title or author name</p>
        <SearchSelect
          type="book"
          value={selectedBook}
          onSelect={setSelectedBook}
          placeholder="Type book title or author…"
        />
        {bookUnavailable && (
          <p className="text-xs text-red-500 mt-1.5">
            ⚠️ This book has no available copies.
          </p>
        )}
      </div>

      {/* Member search */}
      <div>
        <label className="label">Search Member</label>
        <p className="text-xs text-gray-400 mb-1.5">By name or email address</p>
        <SearchSelect
          type="member"
          value={selectedMember}
          onSelect={setSelectedMember}
          placeholder="Type member name or email…"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving || !canSubmit || bookUnavailable}
        >
          {saving ? 'Issuing…' : 'Issue Book'}
        </button>
      </div>
    </form>
  );
}

// ── ReserveForm ───────────────────────────────────────────────────────────────
function ReserveForm({ onClose, onSuccess }) {
  const [selectedBook,   setSelectedBook]   = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = selectedBook && selectedMember;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.post('/circulation/reserve', {
        bookId:   selectedBook._id,
        memberId: selectedMember._id,
      });
      toast.success(`"${selectedBook.title}" reserved for ${selectedMember.name}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reserve failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Search Book</label>
        <p className="text-xs text-gray-400 mb-1.5">By title or author name</p>
        <SearchSelect
          type="book"
          value={selectedBook}
          onSelect={setSelectedBook}
          placeholder="Type book title or author…"
        />
      </div>
      <div>
        <label className="label">Search Member</label>
        <p className="text-xs text-gray-400 mb-1.5">By name or email address</p>
        <SearchSelect
          type="member"
          value={selectedMember}
          onSelect={setSelectedMember}
          placeholder="Type member name or email…"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || !canSubmit}>
          {saving ? 'Reserving…' : 'Reserve Book'}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManageCirculation() {
  const { formatPrice }   = useCurrency();
  const [circulations, setCirculations] = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [issueModal, setIssueModal]     = useState(false);
  const [reserveModal, setReserveModal] = useState(false);

  useEffect(() => { fetchCirculations(); }, [page, typeFilter, statusFilter]);

  const fetchCirculations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (typeFilter)   params.set('type',   typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/circulation?${params}`);
      setCirculations(data.circulations);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleReturn = async (id) => {
    try {
      const { data } = await api.put(`/circulation/return/${id}`);
      const fine = data.fine || 0;
      toast.success(`Book returned${fine > 0 ? ` · Fine: ${formatPrice(fine)}` : ''}`);
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
          <button onClick={() => setReserveModal(true)} className="btn-secondary text-sm">
            + Reserve
          </button>
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

      {/* Table */}
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
                    {c.book?.isbn && <div className="text-xs text-gray-400">{c.book.isbn}</div>}
                  </td>
                  <td className="td">
                    <div className="text-sm font-medium">{c.member?.name}</div>
                    <div className="text-xs text-gray-400">{c.member?.email}</div>
                  </td>
                  <td className="td">
                    <span className="badge badge-gray capitalize">{c.type}</span>
                  </td>
                  <td className="td">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td className="td text-xs text-gray-500">
                    {c.issueDate ? format(new Date(c.issueDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="td text-xs text-gray-500">
                    {c.dueDate
                      ? format(new Date(c.dueDate), 'MMM d, yyyy')
                      : c.reservationExpiry
                        ? format(new Date(c.reservationExpiry), 'MMM d, yyyy')
                        : '—'}
                  </td>
                  <td className="td text-xs">
                    {c.fine > 0 ? (
                      <span className={c.finePaid ? 'text-green-600' : 'text-red-600'}>
                        {formatPrice(c.fine)}{c.finePaid ? ' (paid)' : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="td">
                    {['active', 'overdue'].includes(c.status) && c.type === 'issue' && (
                      <button onClick={() => handleReturn(c._id)}
                        className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors">
                        <CheckIcon className="h-4 w-4" /><span>Return</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {pagination.total} records
          </div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />

      {/* Issue Modal */}
      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue Book to Member" size="md">
        <IssueForm
          onClose={() => setIssueModal(false)}
          onSuccess={fetchCirculations}
        />
      </Modal>

      {/* Reserve Modal */}
      <Modal open={reserveModal} onClose={() => setReserveModal(false)} title="Reserve Book for Member" size="md">
        <ReserveForm
          onClose={() => setReserveModal(false)}
          onSuccess={fetchCirculations}
        />
      </Modal>
    </div>
  );
}
