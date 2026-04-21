import { BookOpenIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { getImageUrl, imgOnError, PLACEHOLDER } from '../../utils/image';

// ── BookCard ───────────────────────────────────────────────────────────────────
export const BookCard = ({ book, onReserve, reserved, priceDisplay }) => {
  const available  = (book.availableCopies || 0) > 0;
  const coverSrc   = getImageUrl(book.coverImage);
  const isDigital  = book.bookType === 'digital' || book.bookType === 'both';
  const isPhysical = book.bookType === 'physical' || book.bookType === 'both' || !book.bookType;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
      <Link to={`/books/${book._id}`} className="block">
        <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          <img
            src={coverSrc}
            alt={book.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={imgOnError}
            loading="lazy"
          />
          {isDigital && (
            <div className="absolute top-2 left-2">
              <span className="badge bg-purple-600 text-white text-xs">
                {book.ebookFormat ? book.ebookFormat.toUpperCase() : 'Digital'}
              </span>
            </div>
          )}
          {priceDisplay && (
            <div className="absolute top-2 right-2">
              <span className="badge bg-yellow-500 text-white text-xs font-bold">{priceDisplay}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/books/${book._id}`}>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug hover:text-primary-600 line-clamp-2 transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">
          {book.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
        </p>
        <div className="mt-auto flex items-center justify-between">
          {isPhysical && (
            <span className={`badge text-xs ${available ? 'badge-green' : 'badge-red'}`}>
              {available ? 'Available' : 'Unavailable'}
            </span>
          )}
          {!isPhysical && isDigital && (
            <span className="badge bg-purple-100 text-purple-700 text-xs">E-Book</span>
          )}
          {onReserve && isPhysical && (
            <button
              onClick={e => { e.preventDefault(); onReserve(book._id); }}
              className="text-primary-600 hover:text-primary-800 transition-colors ml-auto"
              title={reserved ? 'Reserved' : 'Reserve'}
            >
              {reserved
                ? <BookmarkSolid className="h-5 w-5" />
                : <BookmarkIcon  className="h-5 w-5" />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Modal ──────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ── Pagination ─────────────────────────────────────────────────────────────────
export const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) range.push(i);
  return (
    <div className="flex items-center justify-center flex-wrap gap-1 mt-6">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
        ‹ Prev
      </button>
      {range[0] > 1 && <>
        <button onClick={() => onPageChange(1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">1</button>
        {range[0] > 2 && <span className="px-1 text-gray-400">…</span>}
      </>}
      {range.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      {range[range.length - 1] < pages && <>
        {range[range.length - 1] < pages - 1 && <span className="px-1 text-gray-400">…</span>}
        <button onClick={() => onPageChange(pages)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">{pages}</button>
      </>}
      <button onClick={() => onPageChange(page + 1)} disabled={page === pages}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
        Next ›
      </button>
    </div>
  );
};

// ── LoadingSpinner ──────────────────────────────────────────────────────────────
export const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3" />
    <p className="text-sm">{text}</p>
  </div>
);

// ── EmptyState ─────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon = BookOpenIcon, title = 'Nothing here', description = '' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <Icon className="h-12 w-12 mb-3 text-gray-300" />
    <p className="font-medium text-gray-500">{title}</p>
    {description && <p className="text-sm mt-1 text-center max-w-xs">{description}</p>}
  </div>
);

// ── StatCard ───────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon: Icon, color = 'blue', sub }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card flex items-center space-x-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── ConfirmDialog ──────────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, danger }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-gray-600 text-sm mb-6 leading-relaxed">{message}</p>
    <div className="flex justify-end space-x-3">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>Confirm</button>
    </div>
  </Modal>
);
