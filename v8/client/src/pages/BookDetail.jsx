import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import api from '../utils/api';
import { getImageUrl, imgOnError } from '../utils/image';
import { LoadingSpinner } from '../components/ui/index';
import { BookCard } from '../components/ui/index';
import BannerSlot from '../components/ui/BannerSlot';
import BookCover from '../components/books/BookCover';
import FlipbookReader from '../components/reader/FlipbookReader';
import toast from 'react-hot-toast';
import {
  BookOpenIcon, BookmarkIcon, ArrowLeftIcon, ArrowDownTrayIcon,
  ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, LockClosedIcon,
} from '@heroicons/react/24/outline';

// ── Lightbox ──────────────────────────────────────────────────────────────────
function GalleryLightbox({ images, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [images, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
        <XMarkIcon className="h-7 w-7" />
      </button>
      <button onClick={e => { e.stopPropagation(); setIdx(i => (i-1+images.length)%images.length); }}
        className="absolute left-4 text-white/70 hover:text-white"><ChevronLeftIcon className="h-9 w-9"/></button>
      <div onClick={e => e.stopPropagation()} className="max-w-3xl max-h-[85vh] flex flex-col items-center">
        <img src={getImageUrl(images[idx]?.url)} alt={images[idx]?.label || ''}
          className="max-h-[75vh] object-contain rounded-lg shadow-2xl" />
        {images[idx]?.label && <p className="text-white/70 text-sm mt-3">{images[idx].label}</p>}
        <div className="flex space-x-2 mt-4">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); setIdx(i => (i+1)%images.length); }}
        className="absolute right-4 text-white/70 hover:text-white"><ChevronRightIcon className="h-9 w-9"/></button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [book, setBook]               = useState(null);
  const [gallery, setGallery]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [reserved, setReserved]       = useState(false);
  const [reserving, setReserving]     = useState(false);
  const [purchased, setPurchased]     = useState(false);
  const [purchasing, setPurchasing]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reading, setReading]         = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/books/${id}`),
      api.get(`/books/${id}/gallery`),
    ]).then(([b, g]) => {
      setBook(b.data.book);
      setGallery(g.data.images || []);
    }).catch(() => toast.error('Book not found'))
      .finally(() => setLoading(false));

    // Fetch related books
    api.get(`/books/${id}/related`)
      .then(({ data }) => setRelatedBooks(data.books || []))
      .catch(() => {});

    if (user) {
      api.get('/digital/my-purchases')
        .then(({ data }) => setPurchased(data.purchases.some(p => p.book?._id === id || p.book === id)))
        .catch(() => {});
    }
  }, [id, user]);

  const handleReserve = async () => {
    if (!user) { navigate('/login'); return; }
    setReserving(true);
    try {
      await api.post('/circulation/reserve', { bookId: id });
      setReserved(true);
      toast.success('Book reserved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Reservation failed'); }
    finally { setReserving(false); }
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
    } catch (err) { toast.error(err.response?.data?.message || 'Purchase failed'); }
    finally { setPurchasing(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get(`/digital/${id}/download`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) { toast.error(err.response?.data?.message || 'Download failed'); }
    finally { setDownloading(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!book)   return <div className="text-center py-20 text-gray-400">Book not found.</div>;

  const isPhysical  = book.bookType === 'physical' || book.bookType === 'both' || !book.bookType;
  const isDigital   = book.bookType === 'digital'  || book.bookType === 'both' || book.isEbook;
  const available   = (book.availableCopies || 0) > 0;
  const isSale      = book.isDigitalSale;
  const hasFreeDownload = book.downloadEnabled && !isSale;

  // Reading access: check if user is allowed based on access level
  const canReadOnline = book.readingEnabled && (
    book.readingAccessLevel === 'any' ||
    (book.readingAccessLevel === 'member' && user) ||
    (book.readingAccessLevel === 'premium' && user) // backend enforces premium check
  );

  const galleryImages = gallery.length > 0
    ? gallery
    : book.coverImage ? [{ url: book.coverImage, label: 'Cover', _id: 'cover' }] : [];

  return (
    <>
      {reading && <FlipbookReader bookId={id} onClose={() => setReading(false)} />}
      {lightboxIdx !== null && (
        <GalleryLightbox images={galleryImages} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/books" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Books
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="md:flex">

            {/* Cover + gallery strip */}
            <div className="md:w-72 flex-shrink-0 bg-gradient-to-br from-primary-50 to-primary-100 p-6 flex flex-col items-center space-y-3">
              <BookCover book={{ ...book, gallery }} size="lg"
                showGalleryBadge={galleryImages.length > 1}
                onGalleryClick={() => setLightboxIdx(0)}
                className="cursor-pointer" />
              {galleryImages.length > 1 && (
                <div className="flex space-x-1.5 overflow-x-auto py-1 max-w-full">
                  {galleryImages.map((img, i) => (
                    <button key={img._id || i} onClick={() => setLightboxIdx(i)}
                      className={`flex-shrink-0 h-14 w-10 rounded overflow-hidden border-2 transition-all ${i === 0 ? 'border-primary-500' : 'border-transparent hover:border-gray-400'}`}>
                      <img src={getImageUrl(img.url)} alt={img.label} className="h-full w-full object-cover" onError={imgOnError} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 p-8">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {book.categories?.map(c => <span key={c._id} className="badge badge-blue">{c.name}</span>)}
                {isDigital && book.ebookFormat && (
                  <span className="badge bg-purple-100 text-purple-700 uppercase">{book.ebookFormat}</span>
                )}
                {isSale && (
                  <span className="badge bg-yellow-100 text-yellow-800">
                    For Sale · {book.digitalPriceDisplay || formatPrice(book.digitalPrice)}
                  </span>
                )}
                {canReadOnline && <span className="badge bg-green-100 text-green-700">📖 Read Online</span>}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h1>
              <p className="text-gray-500 mb-1">
                By <span className="font-medium text-gray-700">
                  {book.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
                </span>
              </p>
              {book.publisher && (
                <p className="text-sm text-gray-500 mb-4">Publisher: {book.publisher.name}</p>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-5">
                {[
                  ['ISBN',      book.isbn],
                  ['Language',  book.language],
                  ['Year',      book.publicationYear],
                  ['Pages',     book.readingPageCount || book.pages],
                  ['Series',    book.series],
                  ['Edition',   book.edition],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-gray-400">{k}: </span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>

              {/* Physical availability */}
              {isPhysical && (
                <div className="flex items-center space-x-3 mb-5">
                  <span className={`badge text-sm ${available ? 'badge-green' : 'badge-red'}`}>
                    {available ? `${book.availableCopies} ${book.availableCopies === 1 ? 'copy' : 'copies'} available` : 'Not available'}
                  </span>
                  <span className="text-xs text-gray-400">{book.totalCopies} total</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">

                {/* Reserve physical copy */}
                {isPhysical && (
                  reserved
                    ? <span className="badge badge-green px-4 py-2 text-sm font-medium">✓ Reserved</span>
                    : <button onClick={handleReserve} disabled={reserving}
                        className="btn-primary flex items-center space-x-2">
                        <BookmarkIcon className="h-4 w-4" />
                        <span>{reserving ? 'Reserving…' : 'Reserve'}</span>
                      </button>
                )}

                {/* Read online */}
                {canReadOnline && (
                  <button
                    onClick={() => user ? setReading(true) : navigate('/login')}
                    className="btn-secondary flex items-center space-x-2">
                    <BookOpenIcon className="h-4 w-4" />
                    <span>Read Online</span>
                  </button>
                )}

                {/* Reading locked - show why */}
                {book.readingEnabled && !canReadOnline && !user && (
                  <button onClick={() => navigate('/login')}
                    className="btn-secondary flex items-center space-x-2 text-gray-500">
                    <LockClosedIcon className="h-4 w-4" />
                    <span>Login to Read Online</span>
                  </button>
                )}

                {/* Free download */}
                {hasFreeDownload && (
                  <button onClick={() => user ? handleDownload() : navigate('/login')}
                    disabled={downloading}
                    className="btn-secondary flex items-center space-x-2">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>{downloading ? 'Preparing…' : 'Free Download'}</span>
                  </button>
                )}

                {/* Buy */}
                {isSale && !purchased && (
                  <button onClick={handlePurchase} disabled={purchasing}
                    className="btn-primary bg-yellow-500 hover:bg-yellow-600 flex items-center space-x-2">
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span>{purchasing ? 'Processing…' : `Buy ${book.digitalPriceDisplay || formatPrice(book.digitalPrice)}`}</span>
                  </button>
                )}

                {/* Download after purchase */}
                {isSale && purchased && (
                  <button onClick={handleDownload} disabled={downloading}
                    className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>{downloading ? 'Preparing…' : 'Download'}</span>
                  </button>
                )}

                {/* Guest prompt for sale book */}
                {isSale && !user && (
                  <button onClick={() => navigate('/login')}
                    className="btn-secondary flex items-center space-x-2 text-gray-500">
                    <LockClosedIcon className="h-4 w-4" />
                    <span>Login to Purchase</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <div className="px-8 pb-8 pt-6 border-t border-gray-50">
              <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
      </div>
      {/* ── Book Detail Side Banner ───────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <BannerSlot placement="book_detail" className="h-24 sm:h-32" dismissable />
      </div>

      {/* ── Similar / Same Author Books ───────────────────────────────────── */}
      {relatedBooks.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {relatedBooks.map(book => (
              <BookCard key={book._id} book={book}
                priceDisplay={book.isDigitalSale ? formatPrice(book.digitalPrice) : null} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
