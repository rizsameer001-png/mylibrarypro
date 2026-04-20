/**
 * BookGallery  (admin-only)
 * Shows all images for a book with:
 *   - Drag-and-drop reordering (pure CSS + mouse events, no extra lib)
 *   - Upload zone (multiple files)
 *   - Label editing inline
 *   - Set primary / delete controls
 */
import { useState, useRef, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon, StarIcon, TrashIcon, Bars3Icon, CheckIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const PLACEHOLDER = '/no-cover.svg';

export default function BookGallery({ bookId, images: initImages, onChange }) {
  const [images, setImages]     = useState(initImages || []);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx]   = useState(null);
  const [overIdx, setOverIdx]   = useState(null);
  const [editLabel, setEditLabel] = useState({}); // { id: labelText }
  const fileRef = useRef();

  const refresh = (imgs) => { setImages(imgs); onChange?.(imgs); };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f, i) => { fd.append('images', f); fd.append(`label_${i}`, ''); });
    try {
      const { data } = await api.post(`/books/${bookId}/gallery`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refresh([...images, ...data.images]);
      toast.success(`${data.images.length} image(s) uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  // ── Drag-reorder ────────────────────────────────────────────────────────────
  const handleDragStart = (i)  => setDragIdx(i);
  const handleDragEnter = (i)  => setOverIdx(i);
  const handleDragEnd   = async () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null); setOverIdx(null); return;
    }
    const reordered = [...images];
    const [moved]   = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    const withOrder = reordered.map((img, i) => ({ ...img, order: i }));
    setImages(withOrder);
    setDragIdx(null); setOverIdx(null);

    try {
      const { data } = await api.put(`/books/${bookId}/gallery/reorder`, {
        order: withOrder.map((img, i) => ({ _id: img._id, order: i, isPrimary: img.isPrimary, label: img.label })),
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

  // ── Label save ──────────────────────────────────────────────────────────────
  const saveLabel = async (img) => {
    const label = editLabel[img._id] ?? img.label;
    try {
      await api.put(`/books/${bookId}/gallery/reorder`, {
        order: images.map(i => ({
          _id:       i._id,
          order:     i.order,
          isPrimary: i.isPrimary,
          label:     i._id === img._id ? label : i.label,
        })),
      });
      refresh(images.map(i => i._id === img._id ? { ...i, label } : i));
      setEditLabel(prev => { const n = { ...prev }; delete n[img._id]; return n; });
    } catch { toast.error('Save failed'); }
  };

  // ── Drop-zone ───────────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [images]);

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600">
          {uploading ? 'Uploading…' : 'Drop images here or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — up to 10 files</p>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* Gallery grid */}
      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <img src={PLACEHOLDER} alt="No cover" className="h-32 mx-auto opacity-50 mb-2" />
          <p className="text-sm">No images yet — upload one above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img._id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                img.isPrimary ? 'border-primary-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              } ${overIdx === i && dragIdx !== i ? 'scale-105 border-primary-300' : ''}`}
            >
              {/* Image */}
              <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                <img src={img.url || PLACEHOLDER} alt={img.label || 'Gallery image'}
                  className="h-full w-full object-cover" onError={e => { e.target.src = PLACEHOLDER; }} />
              </div>

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1.5 left-1.5 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                  <StarSolid className="h-3 w-3" /><span>Primary</span>
                </div>
              )}

              {/* Drag handle */}
              <div className="absolute top-1.5 right-1.5 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                <Bars3Icon className="h-4 w-4 drop-shadow" />
              </div>

              {/* Controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                <button onClick={() => handlePrimary(img._id)} title="Set as primary"
                  className="text-white hover:text-yellow-400 transition-colors">
                  {img.isPrimary ? <StarSolid className="h-4 w-4 text-yellow-400" /> : <StarIcon className="h-4 w-4" />}
                </button>
                <button onClick={() => handleDelete(img._id)}
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
                    <button onClick={() => saveLabel(img)} className="text-green-600"><CheckIcon className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <p
                    className="text-xs text-gray-500 cursor-pointer hover:text-primary-600 truncate"
                    onClick={() => setEditLabel(prev => ({ ...prev, [img._id]: img.label || '' }))}
                    title="Click to edit label"
                  >
                    {img.label || <span className="italic text-gray-300">No label — click to add</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
