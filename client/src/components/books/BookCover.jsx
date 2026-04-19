/**
 * BookCover
 * Single source of truth for displaying a book's cover image.
 *   - Shows branded SVG placeholder when no cover is available
 *   - Lazy-loads via IntersectionObserver
 *   - Supports gallery (shows badge count + opens lightbox)
 */
import { useState, useRef, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

const PLACEHOLDER = '/no-cover.svg';

// ── Helpers ───────────────────────────────────────────────────────────────────
const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/${url}`;
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function BookCover({
  book,
  className = '',
  size = 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  showGalleryBadge = false,
  onGalleryClick,
}) {
  const sizes = {
    sm: 'h-32 w-24',
    md: 'h-48 w-36',
    lg: 'h-64 w-48',
    xl: 'h-80 w-60',
  };

  const primaryUrl = resolveUrl(book?.coverImage) || PLACEHOLDER;
  const galleryCount = book?.gallery?.length || 0;

  const [src, setSrc] = useState(null);          // null = not yet loaded
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // Lazy load
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSrc(primaryUrl); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [primaryUrl]);

  const displaySrc = error ? PLACEHOLDER : (src || null);

  return (
    <div
      ref={imgRef}
      className={`relative flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ${sizes[size]} ${className}`}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={book?.title || 'Book cover'}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        // Skeleton shimmer while loading
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-gray-200 to-gray-300" />
      )}

      {/* Gallery count badge */}
      {showGalleryBadge && galleryCount > 1 && (
        <button
          onClick={onGalleryClick}
          className="absolute bottom-2 right-2 flex items-center space-x-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full hover:bg-black/80 transition-colors"
        >
          <PhotoIcon className="h-3 w-3" />
          <span>{galleryCount}</span>
        </button>
      )}
    </div>
  );
}
