/**
 * MyDownloads  (member-facing)
 * Shows:
 *  - Tab 1: Purchased digital books  → download signed URL + read online
 *  - Tab 2: In-progress reading sessions
 */
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import BookReader from '../../components/books/BookReader';
import BookCover from '../../components/books/BookCover';
import { LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon, BookOpenIcon, ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function MyDownloads() {
  const [tab, setTab]             = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [readingBook, setReadingBook] = useState(null); // bookId being read
  const [downloading, setDownloading] = useState(null); // bookId being dl'd

  useEffect(() => {
    Promise.all([
      api.get('/digital/my-purchases'),
      api.get('/digital/my-reading'),
    ]).then(([p, r]) => {
      setPurchases(p.data.purchases);
      setSessions(r.data.sessions);
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (bookId, title) => {
    setDownloading(bookId);
    try {
      const { data } = await api.get(`/digital/${bookId}/download`);
      // Open signed URL in new tab — browser handles the download
      window.open(data.url, '_blank', 'noopener,noreferrer');
      toast.success(`Downloading "${title}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const tabs = [
    { key: 'purchases', label: 'My Purchases', icon: ArrowDownTrayIcon },
    { key: 'reading',   label: 'Reading Progress', icon: BookOpenIcon },
  ];

  return (
    <>
      {/* Full-screen reader overlay */}
      {readingBook && (
        <BookReader bookId={readingBook} onClose={() => setReadingBook(null)} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Digital Library</h1>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (

          /* ── Purchases ── */
          tab === 'purchases' ? (
            purchases.length === 0 ? (
              <EmptyState
                icon={ArrowDownTrayIcon}
                title="No purchases yet"
                description="Browse our catalogue and purchase digital books to see them here."
              />
            ) : (
              <div className="space-y-4">
                {purchases.map(p => {
                  const book = p.book;
                  const remaining = p.maxDownloads - p.downloadCount;
                  return (
                    <div key={p._id} className="card flex items-center space-x-4">
                      <BookCover book={book} size="sm" />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{book?.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {book?.authors?.map(a => a.name).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Paid: <span className="font-medium text-gray-700">${p.amountPaid.toFixed(2)}</span></span>
                          <span>Format: <span className="uppercase font-medium text-gray-700">{book?.ebookFormat}</span></span>
                          <span>Downloads left: <span className={`font-medium ${remaining > 0 ? 'text-green-600' : 'text-red-500'}`}>{remaining}</span></span>
                          <span>{format(new Date(p.completedAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                        {/* Read online */}
                        <button
                          onClick={() => setReadingBook(book._id)}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center space-x-1"
                        >
                          <BookOpenIcon className="h-3.5 w-3.5" />
                          <span>Read</span>
                        </button>

                        {/* Download */}
                        <button
                          onClick={() => handleDownload(book._id, book?.title)}
                          disabled={remaining <= 0 || downloading === book._id}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1 disabled:opacity-50"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                          <span>{downloading === book._id ? 'Preparing…' : 'Download'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )

          /* ── Reading sessions ── */
          ) : (
            sessions.length === 0 ? (
              <EmptyState
                icon={BookOpenIcon}
                title="No reading history"
                description="Start reading an e-book to track your progress here."
              />
            ) : (
              <div className="space-y-4">
                {sessions.map(s => {
                  const book = s.book;
                  return (
                    <div key={s._id} className="card flex items-center space-x-4">
                      <BookCover book={book} size="sm" />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{book?.title}</h3>
                        <p className="text-xs text-gray-500">
                          {book?.authors?.map(a => a.name).join(', ')}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Page {s.currentPage}{s.totalPages ? ` of ${s.totalPages}` : ''}</span>
                            <span>{s.progress || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${s.completed ? 'bg-green-500' : 'bg-primary-500'}`}
                              style={{ width: `${s.progress || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          {s.completed && (
                            <span className="flex items-center space-x-1 text-green-600">
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              <span>Completed</span>
                            </span>
                          )}
                          <span className="flex items-center space-x-1">
                            <ClockIcon className="h-3.5 w-3.5" />
                            <span>Last read {format(new Date(s.lastReadAt), 'MMM d, yyyy')}</span>
                          </span>
                          {s.notes?.length > 0 && (
                            <span>{s.notes.length} note{s.notes.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setReadingBook(book._id)}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1 flex-shrink-0"
                      >
                        <BookOpenIcon className="h-3.5 w-3.5" />
                        <span>{s.completed ? 'Re-read' : 'Continue'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )
        )}
      </div>
    </>
  );
}
