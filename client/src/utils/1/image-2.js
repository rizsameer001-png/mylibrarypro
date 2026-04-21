/**
 * image.js — centralised image URL resolver
 *
 * Handles all possible cover image formats the API may return:
 *   1. Full Cloudinary URL  → "https://res.cloudinary.com/..."   (production)
 *   2. Local sim path       → "/uploads/cloudinary-sim/..."       (USE_LOCAL_STORAGE=true)
 *   3. Legacy local path    → "uploads/covers/cover-xxx.jpg"      (old multer direct save)
 *   4. null / undefined     → fallback placeholder
 */

export const PLACEHOLDER = '/no-cover.svg';

/**
 * Resolve any cover image value to a usable <img src> URL.
 * All relative paths are served through the Vite proxy → Express static.
 */
export const getImageUrl = (url) => {
  if (!url) return PLACEHOLDER;

  // Already absolute (Cloudinary, http, data-uri)
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  // Already root-relative  →  /uploads/...
  if (url.startsWith('/')) return url;

  // Bare relative path  →  uploads/covers/... → prefix /
  return `/${url}`;
};

/**
 * React img onError handler — swap to placeholder on broken image.
 */
export const imgOnError = (e) => {
  if (e.target.src !== window.location.origin + PLACEHOLDER) {
    e.target.src = PLACEHOLDER;
  }
};
