/**
 * CloudinaryUploader
 *
 * A complete upload panel with three input modes:
 *   1. Desktop file picker  (single or multiple)
 *   2. Drag & drop zone
 *   3. Paste a Cloudinary URL directly
 *
 * Props:
 *   onUploaded(results[])   — called with array of { secureUrl, publicId, format, bytes }
 *   folder                  — Cloudinary folder (default: 'lms/covers')
 *   resourceType            — 'image' | 'raw'
 *   accept                  — file input accept string
 *   multiple                — allow multiple files (default: false)
 *   label                   — panel heading
 *   showUrlInput            — show "paste URL" option (default: true)
 *   currentUrl              — existing image URL to preview
 *   onRemove                — called when user removes current image
 */
import { useState, useRef, useCallback } from 'react';
import { useCloudinaryMultiUpload } from '../../hooks/useCloudinaryUpload';
import { getImageUrl, imgOnError } from '../../utils/image';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon, LinkIcon, XMarkIcon,
  CheckCircleIcon, ExclamationCircleIcon, PhotoIcon,
} from '@heroicons/react/24/outline';

// ── Single file progress row ───────────────────────────────────────────────
function FileRow({ item }) {
  const icons = {
    pending:   <div className="h-4 w-4 rounded-full border-2 border-gray-300" />,
    uploading: <div className="h-4 w-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />,
    done:      <CheckCircleIcon className="h-4 w-4 text-green-500" />,
    error:     <ExclamationCircleIcon className="h-4 w-4 text-red-500" />,
  };
  return (
    <div className="flex items-center space-x-3 py-1.5">
      <div className="flex-shrink-0">{icons[item.status] || icons.pending}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 truncate">{item.file.name}</p>
        {item.status === 'uploading' && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
          </div>
        )}
        {item.status === 'error' && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
        {item.status === 'done' && (
          <p className="text-xs text-green-600 mt-0.5 truncate">{item.result?.secureUrl}</p>
        )}
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 capitalize">{item.status}</span>
    </div>
  );
}

export default function CloudinaryUploader({
  onUploaded,
  folder        = 'lms/covers',
  resourceType  = 'image',
  accept        = 'image/*',
  multiple      = false,
  label         = 'Upload Images',
  showUrlInput  = true,
  currentUrl    = null,
  onRemove      = null,
}) {
  const inputRef                       = useRef(null);
  const { uploadAll, items, busy, reset } = useCloudinaryMultiUpload();
  const [urlInput, setUrlInput]        = useState('');
  const [urlMode, setUrlMode]          = useState(false);
  const [dragOver, setDragOver]        = useState(false);
  const [localPreviews, setLocalPreviews] = useState([]); // { url, name } before upload

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    // Generate local previews immediately
    if (resourceType === 'image') {
      const previews = files.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
      setLocalPreviews(previews);
    }

    reset();
    try {
      const results = await uploadAll(files, folder, resourceType);
      if (results.length > 0) {
        onUploaded?.(results);
        toast.success(`${results.length} file${results.length > 1 ? 's' : ''} uploaded to Cloudinary`);
      }
      const failed = files.length - results.length;
      if (failed > 0) toast.error(`${failed} file${failed > 1 ? 's' : ''} failed`);
    } catch {
      // individual errors shown in rows
    } finally {
      setLocalPreviews([]);
    }
  }, [folder, resourceType, uploadAll, onUploaded, reset]);

  const handleInputChange = (e) => handleFiles(e.target.files);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // ── URL import ─────────────────────────────────────────────────────────────
  const handleUrlImport = () => {
    const url = urlInput.trim();
    if (!url) { toast.error('Enter a URL first'); return; }
    if (!url.startsWith('http')) { toast.error('URL must start with http/https'); return; }
    onUploaded?.([{ secureUrl: url, publicId: '', format: '', bytes: 0 }]);
    toast.success('URL added');
    setUrlInput('');
    setUrlMode(false);
  };

  const doneCount  = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const showRows   = items.length > 0;

  return (
    <div className="space-y-3">

      {/* Current image preview */}
      {currentUrl && (
        <div className="flex items-center space-x-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="h-14 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-200">
            <img src={getImageUrl(currentUrl)} alt="Current" className="h-full w-full object-cover" onError={imgOnError} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700">Current image</p>
            <p className="text-xs text-gray-400 truncate">{currentUrl}</p>
          </div>
          {onRemove && (
            <button type="button" onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button type="button" onClick={() => setUrlMode(false)}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${!urlMode ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
          <ArrowUpTrayIcon className="h-3.5 w-3.5" />
          <span>Upload File{multiple ? 's' : ''}</span>
        </button>
        {showUrlInput && (
          <button type="button" onClick={() => setUrlMode(true)}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${urlMode ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Paste URL</span>
          </button>
        )}
      </div>

      {/* Upload panel */}
      {!urlMode ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : busy
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={busy}
          />

          {/* Previews while uploading */}
          {localPreviews.length > 0 && resourceType === 'image' ? (
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {localPreviews.map((p, i) => (
                <div key={i} className="h-16 w-12 rounded overflow-hidden bg-gray-200 border border-gray-300">
                  <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <PhotoIcon className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {busy ? 'Uploading to Cloudinary…' : dragOver ? 'Drop here' : `Drop ${multiple ? 'files' : 'a file'} or click to browse`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {resourceType === 'image' ? 'JPG, PNG, WebP' : 'PDF, EPUB, MOBI'}
                {multiple ? ' · Multiple files OK' : ''}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* URL paste panel */
        <div className="space-y-2">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
              placeholder="https://res.cloudinary.com/your-cloud/..."
              className="input pl-9 pr-10 text-sm"
              autoFocus
            />
            {urlInput && (
              <button type="button" onClick={() => setUrlInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* URL preview */}
          {urlInput.startsWith('http') && resourceType === 'image' && (
            <div className="flex items-center space-x-2">
              <div className="h-12 w-9 rounded overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                <img src={urlInput} alt="preview" className="h-full w-full object-cover" onError={imgOnError} />
              </div>
              <p className="text-xs text-gray-500 truncate flex-1">{urlInput}</p>
            </div>
          )}
          <button type="button" onClick={handleUrlImport}
            disabled={!urlInput.trim()}
            className="btn-primary w-full text-sm disabled:opacity-50">
            Use This URL
          </button>
          <p className="text-xs text-gray-400 text-center">
            Paste any Cloudinary image URL or another hosted image URL
          </p>
        </div>
      )}

      {/* Per-file progress rows */}
      {showRows && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 space-y-0.5 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-700">
              {busy ? 'Uploading…' : `${doneCount}/${items.length} complete${errorCount > 0 ? ` · ${errorCount} failed` : ''}`}
            </p>
            {!busy && <button type="button" onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
          </div>
          {items.map(item => <FileRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
