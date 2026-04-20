import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { BookCard, LoadingSpinner, EmptyState, Pagination } from '../components/ui/index';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function Books() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [myReservations, setMyReservations] = useState([]);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    author: '',
    language: '',
    isEbook: '',
    page: 1,
  });

  const languages = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Arabic'];

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
    api.get('/authors').then(({ data }) => setAuthors(data.authors)).catch(() => {});
    if (user?.role === 'member') {
      api.get('/circulation/my').then(({ data }) => {
        const ids = data.circulations.filter(c => c.status === 'reserved').map(c => c.book?._id);
        setMyReservations(ids);
      }).catch(() => {});
    }
  }, [user]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      params.set('limit', '12');
      const { data } = await api.get(`/books?${params}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load books'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleReserve = async (bookId) => {
    if (!user) { toast.error('Please login to reserve'); navigate('/login'); return; }
    try {
      if (myReservations.includes(bookId)) {
        toast('Book already reserved', { icon: 'ℹ️' });
        return;
      }
      await api.post('/circulation/reserve', { bookId });
      setMyReservations(prev => [...prev, bookId]);
      toast.success('Book reserved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Books</h1>
        <p className="text-gray-500 text-sm mt-1">{pagination.total} books found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-56 flex-shrink-0">
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4" /> <span>Filters</span>
            </h2>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder="Search books..."
                className="input pl-9 text-sm" />
            </div>

            {/* Category */}
            <div>
              <label className="label text-xs">Category</label>
              <select className="input text-sm" value={filters.category}
                onChange={e => handleFilterChange('category', e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="label text-xs">Language</label>
              <select className="input text-sm" value={filters.language}
                onChange={e => handleFilterChange('language', e.target.value)}>
                <option value="">All Languages</option>
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* E-Book filter */}
            <div>
              <label className="label text-xs">Type</label>
              <select className="input text-sm" value={filters.isEbook}
                onChange={e => handleFilterChange('isEbook', e.target.value)}>
                <option value="">All Types</option>
                <option value="false">Physical Books</option>
                <option value="true">E-Books</option>
              </select>
            </div>

            <button onClick={() => setFilters({ search: '', category: '', author: '', language: '', isEbook: '', page: 1 })}
              className="btn-secondary w-full text-sm">
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Books Grid */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner />
          ) : books.length === 0 ? (
            <EmptyState title="No books found" description="Try adjusting your search or filters" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {books.map(book => (
                  <BookCard key={book._id} book={book}
                    onReserve={handleReserve}
                    reserved={myReservations.includes(book._id)} />
                ))}
              </div>
              <Pagination page={pagination.page} pages={pagination.pages}
                onPageChange={p => setFilters(prev => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
