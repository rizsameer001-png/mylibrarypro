import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { LoadingSpinner } from '../components/ui/index';
import toast from 'react-hot-toast';
import { BookOpenIcon, BookmarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [reserved, setReserved] = useState(false);

  useEffect(() => {
    api.get(`/books/${id}`)
      .then(({ data }) => setBook(data.book))
      .catch(() => toast.error('Book not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserve = async () => {
    if (!user) { navigate('/login'); return; }
    setReserving(true);
    try {
      await api.post('/circulation/reserve', { bookId: id });
      setReserved(true);
      toast.success('Book reserved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    } finally { setReserving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!book) return <div className="text-center py-20 text-gray-400">Book not found.</div>;

  const cover = book.coverImage ? `/${book.coverImage}` : null;
  const available = book.availableCopies > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link to="/books" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Books
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="md:flex">
          {/* Cover */}
          <div className="md:w-72 flex-shrink-0 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-8 min-h-[320px]">
            {cover
              ? <img src={cover} alt={book.title} className="max-h-72 object-contain rounded-lg shadow-lg" />
              : <BookOpenIcon className="h-24 w-24 text-primary-300" />
            }
          </div>

          {/* Details */}
          <div className="flex-1 p-8">
            <div className="flex flex-wrap gap-2 mb-3">
              {book.categories?.map(c => (
                <span key={c._id} className="badge badge-blue">{c.name}</span>
              ))}
              {book.isEbook && <span className="badge bg-purple-100 text-purple-700">E-Book</span>}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h1>
            <p className="text-gray-500 mb-1">
              By <span className="font-medium text-gray-700">{book.authors?.map(a => a.name).join(', ') || 'Unknown'}</span>
            </p>
            {book.publisher && <p className="text-sm text-gray-500 mb-4">Publisher: {book.publisher.name}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              {[
                ['ISBN', book.isbn],
                ['Language', book.language],
                ['Year', book.publicationYear],
                ['Pages', book.pages],
                ['Series', book.series],
                ['Edition', book.edition],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-500">{k}: </span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>

            {/* Availability */}
            <div className="flex items-center space-x-3 mb-6">
              <span className={`badge text-sm ${available ? 'badge-green' : 'badge-red'}`}>
                {available ? `${book.availableCopies} copy available` : 'Currently unavailable'}
              </span>
              <span className="text-xs text-gray-400">{book.totalCopies} total copies</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!reserved ? (
                <button onClick={handleReserve} disabled={reserving}
                  className="btn-primary flex items-center space-x-2">
                  <BookmarkIcon className="h-4 w-4" />
                  <span>{reserving ? 'Reserving...' : 'Reserve Book'}</span>
                </button>
              ) : (
                <span className="badge-green badge px-4 py-2 text-sm font-medium">✓ Reserved</span>
              )}
              {book.isEbook && user && (
                <a href={`/${book.ebookFile}`} target="_blank" rel="noreferrer"
                  className="btn-secondary flex items-center space-x-2">
                  <BookOpenIcon className="h-4 w-4" />
                  <span>Read E-Book</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <div className="px-8 pb-8">
            <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{book.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
