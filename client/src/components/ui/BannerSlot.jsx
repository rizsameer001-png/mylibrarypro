/**
 * BannerSlot — renders active banners for a placement.
 * Auto-rotates if multiple banners exist.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl, imgOnError } from '../../utils/image';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function BannerSlot({ placement, className = '', dismissable = false }) {
  const [banners,  setBanners]  = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [dismissed,setDismissed]= useState(false);

  useEffect(() => {
    api.get(`/banners?placement=${placement}`)
      .then(({ data }) => setBanners(data.banners || []))
      .catch(() => {});
  }, [placement]);

  // Auto-rotate every 5 s when multiple banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length || dismissed) return null;

  const b = banners[idx];

  const trackClick = () => {
    api.post(`/banners/${b._id}/click`).catch(() => {});
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ backgroundColor: b.bgColor || '#1e40af' }}
    >
      {/* Background image */}
      {b.imageUrl && (
        <div className="absolute inset-0">
          <img src={getImageUrl(b.imageUrl)} alt=""
            className="h-full w-full object-cover opacity-25" onError={imgOnError} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 px-6 py-8 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-wider mb-2"
          style={{ color: b.textColor ? `${b.textColor}99` : '#ffffff99' }}>
          Advertisement
        </p>
        <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: b.textColor || '#fff' }}>
          {b.title}
        </h3>
        {b.subtitle && (
          <p className="text-sm mb-4" style={{ color: b.textColor ? `${b.textColor}cc` : '#ffffffcc' }}>
            {b.subtitle}
          </p>
        )}
        {b.linkUrl && (
          <a href={b.linkUrl} target="_blank" rel="noreferrer" onClick={trackClick}
            className="inline-block px-5 py-2 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur transition-colors"
            style={{ color: b.textColor || '#fff', border: `1px solid ${b.textColor || '#fff'}33` }}>
            {b.linkText || 'Learn More'}
          </a>
        )}
      </div>

      {/* Dots for multiple banners */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}

      {dismissable && (
        <button onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors">
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
