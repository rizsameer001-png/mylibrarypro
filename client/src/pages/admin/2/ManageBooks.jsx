import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../../components/ui/index';
import BookGallery from '../../components/books/BookGallery';
import BookDigitalSettings from '../../components/books/BookDigitalSettings';
import { useCurrency } from '../../contexts/CurrencyContext';
import { getImageUrl, imgOnError } from '../../utils/image';
import CloudinaryUploader from '../../components/ui/CloudinaryUploader';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon, ArrowDownTrayIcon,
  MagnifyingGlassIcon, BookOpenIcon, PhotoIcon, Cog6ToothIcon,
  DocumentIcon, BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

const EMPTY = {
  title:'', isbn:'', description:'', language:'English', publicationYear:'',
  totalCopies:1, authors:[], categories:[], publisher:'', series:'', pages:'',
  bookType:'physical',
  readingEnabled:false, downloadEnabled:false, isDigitalSale:false,
  digitalPrice:0, watermarkEnabled:true, readingAccessLevel:'member',
};

const Toggle = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${value ? 'bg-primary-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 mt-0.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default function ManageBooks() {
  const { formatPrice, currency } = useCurrency();
  const [books, setBooks]       = useState([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editBook, setEditBook]     = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [coverData, setCoverData]   = useState(null);  // { secureUrl, publicId }
  const [ebookData, setEbookData]   = useState(null);  // { secureUrl, publicId, format }
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null); //new Added
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [galleryBook, setGalleryBook] = useState(null);
  const [digitalBook, setDigitalBook] = useState(null);
  const [categories, setCategories]   = useState([]);
  const [authors, setAuthors]         = useState([]);
  const [publishers, setPublishers]   = useState([]);
  const importRef = useRef();

  useEffect(() => {
    api.get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => toast.error('Could not load categories'));
    api.get('/authors')
      .then(({ data }) => setAuthors(data.authors || []))
      .catch(() => toast.error('Could not load authors'));
    api.get('/publishers')
      .then(({ data }) => setPublishers(data.publishers || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchBooks(); }, [search, page, typeFilter]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 15 });
      if (search)     p.set('search', search);
      if (typeFilter) p.set('bookType', typeFilter);
      const { data } = await api.get(`/books?${p}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load books'); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ✅ ADD HERE
      const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      };

  const openCreate = () => {
    setEditBook(null);
    setForm(EMPTY);
    setCoverData(null);
    setEbookData(null);
    setCoverPreview(null);
    setModalOpen(true);
  };

  const openEdit = (book) => {
    setEditBook(book);
    setForm({
      title: book.title, isbn: book.isbn || '', description: book.description || '',
      language: book.language || 'English', publicationYear: book.publicationYear || '',
      totalCopies: book.totalCopies || 1, series: book.series || '', pages: book.pages || '',
      bookType: book.bookType || 'physical',
      authors:    book.authors?.map(a => a._id) || [],
      categories: book.categories?.map(c => c._id) || [],
      publisher: book.publisher?._id || '',
      readingEnabled:     book.readingEnabled || false,
      downloadEnabled:    book.downloadEnabled || false,
      isDigitalSale:      book.isDigitalSale || false,
      digitalPrice:       book.digitalPrice || 0,
      watermarkEnabled:   book.watermarkEnabled !== false,
      readingAccessLevel: book.readingAccessLevel || 'member',
    });
    setCoverData(null);
    setEbookData(null);
    setCoverPreview(getImageUrl(book.coverImage));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Build JSON payload — URLs already on Cloudinary, no file uploads here
      const payload = { ...form };
      if (Array.isArray(payload.authors))    payload.authors    = JSON.stringify(payload.authors);
      if (Array.isArray(payload.categories)) payload.categories = JSON.stringify(payload.categories);
      if (coverData) {
        payload.coverImage         = coverData.secureUrl;
        payload.coverImagePublicId = coverData.publicId;
      }
      if (ebookData) {
        payload.cloudinarySecureUrl = ebookData.secureUrl;
        payload.cloudinaryPublicId  = ebookData.publicId;
        payload.ebookFormat         = ebookData.format;
        payload.cloudinaryBytes     = ebookData.bytes || 0;
      }

      if (editBook) {
        const { data } = await api.put(`/books/${editBook._id}`, payload);
        setBooks(prev => prev.map(b => b._id === editBook._id ? data.book : b));
        toast.success('Book updated');
      } else {
        const { data } = await api.post('/books', payload);
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
      const res = await api.get('/books/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'books.xlsx'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const toggleMulti = (key, id) => setForm(prev => ({
    ...prev,
    [key]: prev[key].includes(id) ? prev[key].filter(x => x !== id) : [...prev[key], id],
  }));

  const typeBadge = (type) => {
    const m = { physical: 'badge-blue', digital: 'bg-purple-100 text-purple-700', both: 'bg-green-100 text-green-700' };
    return `badge ${m[type] || 'badge-gray'}`;
  };

  const isDigital  = form.bookType === 'digital' || form.bookType === 'both';
  const isPhysical = form.bookType === 'physical' || form.bookType === 'both';

  return (
    <div>
      {/* Header */}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search books..." className="input pl-9" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input w-40">
          <option value="">All Types</option>
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : books.length === 0 ? (
        <EmptyState icon={BookOpenIcon} title="No books found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="table-base">
            <thead><tr>
              {['Cover & Title', 'Authors', 'Category', 'Type', 'Copies', 'Price', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {books.map(book => (
                <tr key={book._id} className="hover:bg-gray-50">
                  <td className="td font-medium max-w-xs">
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail */}
                      <div className="h-12 w-9 flex-shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={getImageUrl(book.coverImage)}
                          alt={book.title}
                          className="h-full w-full object-cover"
                          onError={imgOnError}
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate max-w-[140px] text-sm">{book.title}</div>
                        {book.isbn && <div className="text-xs text-gray-400">{book.isbn}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="td text-xs text-gray-500 max-w-[120px]">
                    <div className="truncate">{book.authors?.map(a => a.name).join(', ') || '—'}</div>
                  </td>
                  <td className="td text-xs max-w-[100px]">
                    <div className="truncate">{book.categories?.map(c => c.name).join(', ') || '—'}</div>
                  </td>
                  <td className="td">
                    <span className={typeBadge(book.bookType)}>{book.bookType}</span>
                    {book.ebookFormat && (
                      <span className="ml-1 badge bg-gray-100 text-gray-600 uppercase text-xs">{book.ebookFormat}</span>
                    )}
                  </td>
                  <td className="td text-center text-sm">
                    {book.bookType === 'digital' ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <span className={`badge ${book.availableCopies > 0 ? 'badge-green' : 'badge-red'}`}>
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                    )}
                  </td>
                  <td className="td text-sm">
                    {book.isDigitalSale
                      ? <span className="text-green-700 font-medium">{book.digitalPriceDisplay || formatPrice(book.digitalPrice)}</span>
                      : <span className="text-gray-400 text-xs">—</span>
                    }
                  </td>
                  <td className="td">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => openEdit(book)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(book._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setGalleryBook(book)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg" title="Gallery">
                        <PhotoIcon className="h-4 w-4" />
                      </button>
                      {(book.bookType === 'digital' || book.bookType === 'both') && (
                        <button onClick={() => setDigitalBook(book)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Digital Settings">
                          <Cog6ToothIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">{pagination.total} books</div>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editBook ? 'Edit Book' : 'Add New Book'} size="xl">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Book Type */}
          <div>
            <label className="label">Book Type *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: 'physical', label: 'Physical', icon: BuildingLibraryIcon, desc: 'Physical copies' },
                { value: 'digital',  label: 'Digital',  icon: DocumentIcon,        desc: 'PDF / EPUB / MOBI' },
                { value: 'both',     label: 'Both',     icon: BookOpenIcon,         desc: 'Physical + Digital' },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button key={value} type="button" onClick={() => set('bookType', value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${form.bookType === value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <Icon className={`h-6 w-6 mb-1 ${form.bookType === value ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${form.bookType === value ? 'text-primary-700' : 'text-gray-700'}`}>{label}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">ISBN</label>
              <input className="input" value={form.isbn} onChange={e => set('isbn', e.target.value)} />
            </div>
            <div>
              <label className="label">Language</label>
              <input className="input" value={form.language} onChange={e => set('language', e.target.value)} />
            </div>
            <div>
              <label className="label">Publication Year</label>
              <input type="number" className="input" value={form.publicationYear} onChange={e => set('publicationYear', e.target.value)} />
            </div>
            <div>
              <label className="label">Series</label>
              <input className="input" value={form.series} onChange={e => set('series', e.target.value)} />
            </div>
            <div>
              <label className="label">Publisher</label>
              <select className="input" value={form.publisher} onChange={e => set('publisher', e.target.value)}>
                <option value="">Select Publisher</option>
                {publishers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pages</label>
              <input type="number" className="input" value={form.pages} onChange={e => set('pages', e.target.value)} />
            </div>
          </div>

          {/* Physical copies */}
          {isPhysical && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                <BuildingLibraryIcon className="h-4 w-4" /><span>Physical Copies</span>
              </h3>
              <div>
                <label className="label">Total Copies</label>
                <input type="number" min="1" className="input max-w-xs" value={form.totalCopies}
                  onChange={e => set('totalCopies', parseInt(e.target.value) || 1)} />
              </div>
            </div>
          )}

          {/* Digital settings */}
          {isDigital && (
            <div className="bg-purple-50 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-purple-800 flex items-center space-x-2">
                <DocumentIcon className="h-4 w-4" /><span>Digital File Settings</span>
              </h3>
              <div>
                <label className="label">Upload Digital File (PDF, EPUB, MOBI)</label>
                {editBook?.cloudinaryPublicId && !ebookData && (
                  <p className="text-xs text-green-600 mb-2">✅ File already on Cloudinary (.{editBook.ebookFormat})</p>
                )}
                <CloudinaryUploader
                  folder="lms/ebooks"
                  resourceType="raw"
                  accept=".pdf,.epub,.mobi,application/pdf"
                  multiple={false}
                  showUrlInput
                  label="Upload PDF / EPUB / MOBI"
                  onUploaded={(results) => {
                    const r = results[0];
                    setEbookData({ ...r, format: r.format || r.secureUrl?.split('.').pop() || '' });
                  }}
                />
                {ebookData && (
                  <p className="text-xs text-green-600 mt-1">✅ New file ready: {ebookData.secureUrl?.split('/').pop()}</p>
                )}
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100 space-y-1">
                <Toggle label="Enable Online Reading" description="Members can read in browser"
                  value={form.readingEnabled} onChange={v => set('readingEnabled', v)} />
                {form.readingEnabled && (
                  <div className="pl-2 pb-1">
                    <label className="label text-xs">Who can read?</label>
                    <select className="input text-sm" value={form.readingAccessLevel}
                      onChange={e => set('readingAccessLevel', e.target.value)}>
                      <option value="any">Everyone</option>
                      <option value="member">Registered members only</option>
                      <option value="premium">Premium members only</option>
                    </select>
                  </div>
                )}
                <Toggle label="Enable Free Download" description="Members can download without paying"
                  value={form.downloadEnabled} onChange={v => set('downloadEnabled', v)} />
                <Toggle label="Sell as paid download"
                  value={form.isDigitalSale} onChange={v => set('isDigitalSale', v)} />
                {form.isDigitalSale && (
                  <div className="pl-2 pb-1">
                    <label className="label text-xs">Price ({currency})</label>
                    <input type="number" step="0.01" min="0" className="input max-w-[140px] mt-1"
                      value={form.digitalPrice} onChange={e => set('digitalPrice', parseFloat(e.target.value) || 0)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cover image */}
          <div>
            <label className="label">Cover Image</label>
            <div className="flex items-center space-x-3 mt-1">
              <div className="h-24 w-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                <img
                  src={coverPreview || '/no-cover.svg'}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                  onError={imgOnError}
                />
              </div>
              <label className="btn-secondary text-sm cursor-pointer flex items-center space-x-2">
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span>{coverFile ? coverFile.name : 'Choose cover image'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
              </label>
{/*              {coverFile && (
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(editBook ? getImageUrl(editBook.coverImage) : null); }}
                  className="text-xs text-red-500">Remove</button>
              )}*/}
              {coverFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(editBook ? getImageUrl(editBook.coverImage) : null);
                    }}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Categories</label>
              {form.categories.length > 0 && (
                <span className="text-xs text-primary-600 font-medium">{form.categories.length} selected</span>
              )}
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ No categories found. Add them in{' '}
                <a href="/admin/categories" target="_blank" className="text-primary-600 underline">Manage Categories</a>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c._id} type="button" onClick={() => toggleMulti('categories', c._id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.categories.includes(c._id)
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'border-gray-300 text-gray-600 hover:border-primary-400 hover:bg-primary-50'
                    }`}>
                    {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Authors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Authors</label>
              {form.authors.length > 0 && (
                <span className="text-xs text-primary-600 font-medium">{form.authors.length} selected</span>
              )}
            </div>
            {authors.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ No authors found. Add them in{' '}
                <a href="/admin/categories" target="_blank" className="text-primary-600 underline">Manage Categories → Authors tab</a>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {authors.map(a => (
                  <button key={a._id} type="button" onClick={() => toggleMulti('authors', a._id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.authors.includes(a._id)
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'border-gray-300 text-gray-600 hover:border-primary-400 hover:bg-primary-50'
                    }`}>
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editBook ? 'Update Book' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Book" message="Delete this book permanently? Cloudinary files will also be removed." danger />

      <Modal open={!!galleryBook} onClose={() => setGalleryBook(null)}
        title={`Gallery — ${galleryBook?.title || ''}`} size="xl">
        {galleryBook && <BookGallery bookId={galleryBook._id} images={[]} onChange={() => {}} />}
      </Modal>

      <Modal open={!!digitalBook} onClose={() => setDigitalBook(null)}
        title={`Digital Settings — ${digitalBook?.title || ''}`} size="lg">
        {digitalBook && (
          <BookDigitalSettings book={digitalBook}
            onUpdated={u => { setBooks(prev => prev.map(b => b._id === u._id ? { ...b, ...u } : b)); setDigitalBook(u); }}
            onClose={() => setDigitalBook(null)} />
        )}
      </Modal>
    </div>
  );
}
