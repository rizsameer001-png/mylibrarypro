import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, BookOpenIcon } from '@heroicons/react/24/outline';

const EMPTY = { title: '', isbn: '', description: '', language: 'English', publicationYear: '', totalCopies: 1, authors: [], categories: [], publisher: '', series: '', pages: '' };

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const importRef = useRef();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
    api.get('/authors').then(({ data }) => setAuthors(data.authors)).catch(() => {});
    api.get('/publishers').then(({ data }) => setPublishers(data.publishers)).catch(() => {});
  }, []);

  useEffect(() => { fetchBooks(); }, [search, page]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const { data } = await api.get(`/books?${params}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load books'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditBook(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (book) => {
    setEditBook(book);
    setForm({
      title: book.title, isbn: book.isbn || '', description: book.description || '',
      language: book.language || 'English', publicationYear: book.publicationYear || '',
      totalCopies: book.totalCopies, authors: book.authors?.map(a => a._id) || [],
      categories: book.categories?.map(c => c._id) || [], publisher: book.publisher?._id || '',
      series: book.series || '', pages: book.pages || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editBook) {
        const { data } = await api.put(`/books/${editBook._id}`, form);
        setBooks(prev => prev.map(b => b._id === editBook._id ? data.book : b));
        toast.success('Book updated');
      } else {
        const { data } = await api.post('/books', form);
        setBooks(prev => [data.book, ...prev]);
        toast.success('Book created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/books/${deleteId}`);
      setBooks(prev => prev.filter(b => b._id !== deleteId));
      toast.success('Book deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('excel', file);
    try {
      const { data } = await api.post('/books/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported: ${data.results.success} books`);
      fetchBooks();
    } catch { toast.error('Import failed'); }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/books/export', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a'); a.href = url; a.download = 'books.xlsx'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const toggleMulti = (key, id) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter(x => x !== id) : [...prev[key], id]
    }));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Books</h1>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => importRef.current?.click()} className="btn-secondary text-sm flex items-center space-x-1">
            <ArrowUpTrayIcon className="h-4 w-4" /><span>Import</span>
          </button>
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center space-x-1">
            <ArrowDownTrayIcon className="h-4 w-4" /><span>Export</span>
          </button>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center space-x-1">
            <PlusIcon className="h-4 w-4" /><span>Add Book</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search books..." className="input pl-9 max-w-sm" />
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : books.length === 0 ? (
        <EmptyState icon={BookOpenIcon} title="No books found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Title', 'Authors', 'Category', 'Copies', 'Available', 'Type', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {books.map(book => (
                <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-medium max-w-xs">
                    <div className="truncate">{book.title}</div>
                    {book.isbn && <div className="text-xs text-gray-400">{book.isbn}</div>}
                  </td>
                  <td className="td text-gray-500 text-xs">{book.authors?.map(a => a.name).join(', ') || '—'}</td>
                  <td className="td text-xs">{book.categories?.map(c => c.name).join(', ') || '—'}</td>
                  <td className="td text-center">{book.totalCopies}</td>
                  <td className="td text-center">
                    <span className={`badge ${book.availableCopies > 0 ? 'badge-green' : 'badge-red'}`}>
                      {book.availableCopies}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`badge ${book.isEbook ? 'bg-purple-100 text-purple-700' : 'badge-gray'}`}>
                      {book.isEbook ? 'E-Book' : 'Physical'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => openEdit(book)} className="text-blue-500 hover:text-blue-700 p-1">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(book._id)} className="text-red-500 hover:text-red-700 p-1">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {pagination.total} total books
          </div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editBook ? 'Edit Book' : 'Add New Book'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">ISBN</label>
              <input className="input" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div>
              <label className="label">Language</label>
              <input className="input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} />
            </div>
            <div>
              <label className="label">Total Copies</label>
              <input type="number" min="1" className="input" value={form.totalCopies}
                onChange={e => setForm({ ...form, totalCopies: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="label">Publication Year</label>
              <input type="number" className="input" value={form.publicationYear}
                onChange={e => setForm({ ...form, publicationYear: e.target.value })} />
            </div>
            <div>
              <label className="label">Pages</label>
              <input type="number" className="input" value={form.pages}
                onChange={e => setForm({ ...form, pages: e.target.value })} />
            </div>
            <div>
              <label className="label">Series</label>
              <input className="input" value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} />
            </div>
            <div>
              <label className="label">Publisher</label>
              <select className="input" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })}>
                <option value="">Select Publisher</option>
                {publishers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Categories multi-select */}
          <div>
            <label className="label">Categories</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map(c => (
                <button key={c._id} type="button"
                  onClick={() => toggleMulti('categories', c._id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.categories.includes(c._id) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Authors multi-select */}
          <div>
            <label className="label">Authors</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {authors.map(a => (
                <button key={a._id} type="button"
                  onClick={() => toggleMulti('authors', a._id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.authors.includes(a._id) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editBook ? 'Update Book' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Book" message="Are you sure you want to delete this book? This action cannot be undone." danger />
    </div>
  );
}
