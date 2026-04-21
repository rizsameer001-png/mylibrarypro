/**
 * BookCover — unified cover image with lazy-load, placeholder, gallery badge.
 */
import { useState, useRef, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { getImageUrl, imgOnError, PLACEHOLDER } from '../../utils/image';

const SIZE_CLASSES = {
  sm: 'h-32 w-24',
  md: 'h-48 w-36',
  lg: 'h-64 w-48',
  xl: 'h-80 w-60',
};

export default function BookCover({
  book,
  size = 'md',
  className = '',
  showGalleryBadge = false,
  onGalleryClick,
}) {
  const sizeClass    = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const primaryUrl   = getImageUrl(book?.coverImage);
  const galleryCount = book?.gallery?.length || 0;

  const [loaded, setLoaded]   = useState(false);
  const [src, setSrc]         = useState(null);
  const [error, setError]     = useState(false);
  const ref                   = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setSrc(null);
  }, [primaryUrl]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSrc(primaryUrl); },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [primaryUrl]);

  const displaySrc = error ? PLACEHOLDER : (src || null);

  return (
    <div
      ref={ref}
      className={`relative flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ${sizeClass} ${className}`}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={book?.title || 'Book cover'}
          className="h-full w-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={(e) => { setError(true); imgOnError(e); }}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <PhotoIcon className="h-8 w-8 text-gray-400 opacity-40" />
        </div>
      )}

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
