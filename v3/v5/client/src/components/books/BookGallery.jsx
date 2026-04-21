/**
 * BookGallery — Admin image gallery manager
 * Three ways to add images:
 *   1. Desktop file picker (multiple)
 *   2. Drag & drop
 *   3. Paste Cloudinary URL
 * Drag-to-reorder, set primary, label edit, delete.
 */
import { useState, useCallback } from 'react';
import api from '../../utils/api';
import { getImageUrl, imgOnError, PLACEHOLDER } from '../../utils/image';
import CloudinaryUploader from '../ui/CloudinaryUploader';
import toast from 'react-hot-toast';
import { StarIcon, TrashIcon, Bars3Icon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

export default function BookGallery({ bookId, images: initImages = [], onChange }) {
  const [images, setImages]       = useState(initImages);
  const [saving,  setSaving]      = useState(false);
  const [dragIdx, setDragIdx]     = useState(null);
  const [overIdx, setOverIdx]     = useState(null);
  const [editLabel, setEditLabel] = useState({});
  const [showAdd, setShowAdd]     = useState(images.length === 0);

  const refresh = (imgs) => { setImages(imgs); onChange?.(imgs); };

  // ── Called when CloudinaryUploader finishes uploading ─────────────────────
  const handleUploaded = useCallback(async (results) => {
    setSaving(true);
    try {
      const existing = images.length;
      // Send each uploaded file URL to our API to save to DB
      const created = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const payload = {
          url:      r.secureUrl,
          publicId: r.publicId || '',
          label:    '',
          order:    existing + i,
          isPrimary: existing === 0 && i === 0,
        };
        const { data } = await api.post(`/books/${bookId}/gallery/add-url`, payload);
        if (data.image) created.push(data.image);
      }
      refresh([...images, ...created]);
      toast.success(`${created.length} image(s) added to gallery`);
      setShowAdd(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save images');
    } finally { setSaving(false); }
  }, [bookId, images]);

  // ── Drag reorder ────────────────────────────────────────────────────────────
  const handleDragEnd = async () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null); setOverIdx(null); return;
    }
    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    const withOrder = reordered.map((img, i) => ({ ...img, order: i }));
    setImages(withOrder);
    setDragIdx(null); setOverIdx(null);
    try {
      const { data } = await api.put(`/books/${bookId}/gallery/reorder`, {
        order: withOrder.map((img, i) => ({
          _id: img._id, order: i, isPrimary: img.isPrimary, label: img.label,
        })),
      });
      refresh(data.images);
    } catch { toast.error('Reorder failed'); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (imgId) => {
    try {
      await api.delete(`/books/${bookId}/gallery/${imgId}`);
      const updated = images.filter(i => i._id !== imgId);
      refresh(updated);
      toast.success('Image removed');
      if (updated.length === 0) setShowAdd(true);
    } catch { toast.error('Delete failed'); }
  };

  // ── Set primary ─────────────────────────────────────────────────────────────
  const handlePrimary = async (imgId) => {
    try {
      await api.put(`/books/${bookId}/gallery/${imgId}/primary`);
      refresh(images.map(i => ({ ...i, isPrimary: i._id === imgId })));
      toast.success('Primary cover updated');
    } catch { toast.error('Failed'); }
  };

  // ── Label save ───────────────────────────────────────────────────────────────
  const saveLabel = async (img) => {
    const label = editLabel[img._id] ?? img.label;
    try {
      await api.put(`/books/${bookId}/gallery/reorder`, {
        order: images.map(i => ({
          _id: i._id, order: i.order, isPrimary: i.isPrimary,
          label: i._id === img._id ? label : i.label,
        })),
      });
      refresh(images.map(i => i._id === img._id ? { ...i, label } : i));
      setEditLabel(prev => { const n = { ...prev }; delete n[img._id]; return n; });
    } catch { toast.error('Save failed'); }
  };

  return (
    <div className="space-y-5">

      {/* ── Existing images grid ──────────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={img._id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragEnter={() => setOverIdx(i)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                img.isPrimary ? 'border-primary-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              } ${overIdx === i && dragIdx !== i ? 'scale-105 border-primary-300' : ''}`}
            >
              {/* Image */}
              <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                <img
                  src={getImageUrl(img.url)}
                  alt={img.label || 'Gallery image'}
                  className="h-full w-full object-cover"
                  onError={imgOnError}
                  loading="lazy"
                />
              </div>

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1.5 left-1.5 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                  <StarSolid className="h-3 w-3" /><span>Primary</span>
                </div>
              )}

              {/* Drag handle hint */}
              <div className="absolute top-1.5 right-1.5 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                <Bars3Icon className="h-4 w-4 drop-shadow" />
              </div>

              {/* Hover controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                <button type="button" onClick={() => handlePrimary(img._id)}
                  title="Set as primary" className="text-white hover:text-yellow-400 transition-colors">
                  {img.isPrimary
                    ? <StarSolid className="h-4 w-4 text-yellow-400" />
                    : <StarIcon  className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => handleDelete(img._id)}
                  className="text-white hover:text-red-400 transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Label editor */}
              <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                {editLabel[img._id] !== undefined ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="text-xs border border-gray-300 rounded px-1.5 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={editLabel[img._id]}
                      onChange={e => setEditLabel(prev => ({ ...prev, [img._id]: e.target.value }))}
                      autoFocus
                    />
                    <button type="button" onClick={() => saveLabel(img)} className="text-green-600">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-xs text-gray-500 cursor-pointer hover:text-primary-600 truncate"
                    onClick={() => setEditLabel(prev => ({ ...prev, [img._id]: img.label || '' }))}
                    title="Click to edit label"
                  >
                    {img.label || <span className="italic text-gray-300">Add label…</span>}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add more button */}
          {!showAdd && (
            <button type="button" onClick={() => setShowAdd(true)}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center justify-center transition-colors group">
              <PlusIcon className="h-8 w-8 text-gray-300 group-hover:text-primary-400 transition-colors" />
              <span className="text-xs text-gray-400 group-hover:text-primary-500 mt-1">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* ── Upload panel ───────────────────────────────────────────────────── */}
      {(showAdd || images.length === 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Add Images to Gallery</h3>
            {images.length > 0 && (
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            )}
          </div>
          <CloudinaryUploader
            folder="lms/gallery"
            resourceType="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            label="Upload Gallery Images"
            showUrlInput
            onUploaded={handleUploaded}
          />
          {saving && (
            <p className="text-xs text-primary-600 mt-2 text-center animate-pulse">Saving to library…</p>
          )}
        </div>
      )}

      {images.length === 0 && !showAdd && (
        <div className="text-center py-6">
          <img src={PLACEHOLDER} alt="No images" className="h-20 mx-auto opacity-30 mb-2" />
          <p className="text-sm text-gray-400">No gallery images yet</p>
        </div>
      )}
    </div>
  );
}
