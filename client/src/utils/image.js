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
// export const getImageUrl = (url) => {
//   if (!url) return PLACEHOLDER;

//   // Already absolute (Cloudinary, http, data-uri)
//   if (url.startsWith('http') || url.startsWith('data:')) return url;

//   // Already root-relative  →  /uploads/...
//   if (url.startsWith('/')) return url;

//   // Bare relative path  →  uploads/covers/... → prefix /
//   return `/${url}`;
// };

// export const getImageUrl = (url) => {
//   if (!url) return PLACEHOLDER;

//   // 1. Already absolute (Cloudinary production, http, data-uri)
//   if (url.startsWith('http') || url.startsWith('data:')) return url;

//   // 2. Local Simulation Check (The Fix)
//   // If the path contains 'cloudinary-sim', it must go to the Backend API port
//   if (url.includes('cloudinary-sim')) {
//     const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
//     // Ensure no double slashes
//     const cleanPath = url.startsWith('/') ? url : `/${url}`;
//     return `${backendUrl}${cleanPath}`;
//   }

//   // 3. Already root-relative (true local public folder assets)
//   if (url.startsWith('/')) return url;

//   // 4. Bare relative path
//   return `/${url}`;
// };

export const getImageUrl = (url) => {
  if (!url) return PLACEHOLDER;

  // 1. Absolute URLs (Cloudinary, External links)
  if (url.startsWith('http') || url.startsWith('data:')) return url;

  // 2. ALL Local Server Assets (The robust fix)
  // If the path starts with 'uploads' or '/uploads', it belongs to the Express server
  if (url.startsWith('uploads') || url.includes('/uploads/')) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Ensure the path starts with a single slash: /uploads/...
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    
    // Result: http://localhost:5000/uploads/covers/image.jpg
    return `${backendUrl}${cleanPath}`;
  }

  // 3. Frontend Public Assets (e.g., logos or icons in the React 'public' folder)
  if (url.startsWith('/')) return url;

  // 4. Fallback for everything else
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
