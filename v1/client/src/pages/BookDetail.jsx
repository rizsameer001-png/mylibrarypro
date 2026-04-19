import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { LoadingSpinner } from '../components/ui/index';
import BookCover from '../components/books/BookCover';
import BookReader from '../components/books/BookReader';
import toast from 'react-hot-toast';
import {
  BookOpenIcon, BookmarkIcon, ArrowLeftIcon,
  ArrowDownTrayIcon, ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

function GalleryLightbox({ images, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
        <XMarkIcon className="h-7 w-7" />
      </button>
      <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white/70 hover:text-white">
        <ChevronLeftIcon className="h-9 w-9" />
      </button>
      <div onClick={e => e.stopPropagation()} className="max-w-3xl max-h-[85vh] flex flex-col items-center">
        <img src={images[idx]?.url || '/no-cover.svg'} alt={images[idx]?.label || ''}
          className="max-h-[75vh] object-contain rounded-lg shadow-2xl" />
        {images[idx]?.label && <p className="text-white/70 text-sm mt-3">{images[idx].label}</p>}
        <div className="flex space-x-2 mt-4">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 text-white/70 hover:text-white">
        <ChevronRightIcon className="h-9 w-9" />
      </button>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook]             = useState(null);
  const [gallery, setGallery]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [reserving, setReserving]   = useState(false);
  const [reserved, setReserved]     = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased]   = useState(false);
  const [reading, setReading]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/books/${id}`),
      api.get(`/books/${id}/gallery`),
    ]).then(([b, g]) => {
      setBook(b.data.book);
      setGallery(g.data.images || []);
    }).catch(() => toast.error('Book not found'))
      .finally(() => setLoading(false));

    if (user) {
      api.get('/digital/my-purchases').then(({ data }) => {
        setPurchased(data.purchases.some(p => p.book?._id === id || p.book === id));
      }).catch(() => {});
    }
  }, [id, user]);

  const handleReserve = async () => {
    if (!user) { navigate('/login'); return; }
    setReserving(true);
    try {
      await api.post('/circulation/reserve', { bookId: id });
      setReserved(true);
      toast.success('Book reserved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    } finally { setReserving(false); }
  };

  const handlePurchase = async () => {
    if (!user) { navigate('/login'); return; }
    setPurchasing(true);
    try {
      await api.post(`/digital/${id}/purchase`, {
        paymentProvider: 'manual',
        paymentId: `demo_${Date.now()}`,
        amountPaid: book.digitalPrice,
      });
      setPurchased(true);
      toast.success('Purchase successful! Check My Downloads.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get(`/digital/${id}/download`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    } finally { setDownloading(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!book)   return <div className="text-center py-20 text-gray-400">Book not found.</div>;

  const available     = book.availableCopies > 0;
  const canRead       = book.readingEnabled;
  const isSale        = book.isDigitalSale;
  const galleryImages = gallery.length > 0
    ? gallery
    : book.coverImage ? [{ url: book.coverImage, label: 'Cover', _id: 'cover' }] : [];

  return (
    <>
      {reading && <BookReader bookId={id} onClose={() => setReading(false)} />}
      {lightboxIdx !== null && (
        <GalleryLightbox images={galleryImages} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/books" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Books
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-72 flex-shrink-0 bg-gradient-to-br from-primary-50 to-primary-100 p-6 flex flex-col items-center space-y-3">
              <BookCover book={{ ...book, gallery }} size="lg"
                showGalleryBadge={galleryImages.length > 1}
                onGalleryClick={() => setLightboxIdx(0)}
                className="cursor-pointer" />
              {galleryImages.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto py-1 max-w-full">
                  {galleryImages.map((img, i) => (
                    <button key={img._id} onClick={() => setLightboxIdx(i)}
                      className={`flex-shrink-0 h-14 w-10 rounded-md overflow-hidden border-2 transition-all ${i === 0 ? 'border-primary-500' : 'border-transparent hover:border-gray-400'}`}>
                      <img src={img.url || '/no-cover.svg'} alt={img.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 p-8">
              <div className="flex flex-wrap gap-2 mb-3">
                {book.categories?.map(c => <span key={c._id} className="badge badge-blue">{c.name}</span>)}
                {book.isEbook  && <span className="badge bg-purple-100 text-purple-700">E-Book</span>}
                {isSale        && <span className="badge bg-yellow-100 text-yellow-800">For Sale ${book.digitalPrice?.toFixed(2)}</span>}
                {canRead       && <span className="badge bg-green-100 text-green-700">Read Online</span>}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h1>
              <p className="text-gray-500 mb-1">
                By <span className="font-medium text-gray-700">{book.authors?.map(a => a.name).join(', ') || 'Unknown'}</span>
              </p>
              {book.publisher && <p className="text-sm text-gray-500 mb-4">Publisher: {book.publisher.name}</p>}

              <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                {[['ISBN', book.isbn], ['Language', book.language], ['Year', book.publicationYear],
                  ['Pages', book.readingPageCount || book.pages], ['Series', book.series], ['Edition', book.edition],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><span className="text-gray-500">{k}: </span><span className="font-medium text-gray-800">{v}</span></div>
                ))}
              </div>

              {!book.isEbook && (
                <div className="flex items-center space-x-3 mb-5">
                  <span className={`badge text-sm ${available ? 'badge-green' : 'badge-red'}`}>
                    {available ? `${book.availableCopies} copies available` : 'Unavailable'}
                  </span>
                  <span className="text-xs text-gray-400">{book.totalCopies} total</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {!book.isEbook && (
                  reserved
                    ? <span className="badge-green badge px-4 py-2 text-sm font-medium">Reserved</span>
                    : <button onClick={handleReserve} disabled={reserving} className="btn-primary flex items-center space-x-2">
                        <BookmarkIcon className="h-4 w-4" />
                        <span>{reserving ? 'Reserving...' : 'Reserve'}</span>
                      </button>
                )}

                {canRead && user && (
                  <button onClick={() => setReading(true)} className="btn-secondary flex items-center space-x-2">
                    <BookOpenIcon className="h-4 w-4" /><span>Read Online</span>
                  </button>
                )}

                {isSale && user && (
                  purchased
                    ? <button onClick={handleDownload} disabled={downloading}
                        className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>{downloading ? 'Preparing...' : 'Download'}</span>
                      </button>
                    : <button onClick={handlePurchase} disabled={purchasing}
                        className="btn-primary bg-yellow-500 hover:bg-yellow-600 flex items-center space-x-2">
                        <ShoppingCartIcon className="h-4 w-4" />
                        <span>{purchasing ? 'Processing...' : `Buy $${book.digitalPrice?.toFixed(2)}`}</span>
                      </button>
                )}

                {book.isEbook && !isSale && !canRead && user && (
                  <button onClick={() => setReading(true)} className="btn-secondary flex items-center space-x-2">
                    <BookOpenIcon className="h-4 w-4" /><span>Read E-Book</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {book.description && (
            <div className="px-8 pb-8 border-t border-gray-50 pt-6">
              <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
