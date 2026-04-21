/**
 * useCloudinaryUpload
 * Uploads files DIRECTLY from browser to Cloudinary.
 * Supports single file, multiple files, and URL-based imports.
 * No files ever touch the server disk.
 */
import { useState, useCallback } from 'react';
import api from '../utils/api';

// Upload a single file to Cloudinary using a server-signed URL
const uploadOneFile = async (file, sig, onProgress) => {
  const resourceType = sig.resourceType || 'image';
  const fd = new FormData();
  fd.append('file',      file);
  fd.append('api_key',   sig.apiKey);
  fd.append('timestamp', sig.timestamp);
  fd.append('signature', sig.signature);
  fd.append('folder',    sig.folder);

  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload  = () => {
      if (xhr.status === 200) {
        const r = JSON.parse(xhr.responseText);
        resolve({ secureUrl: r.secure_url, publicId: r.public_id, format: r.format, bytes: r.bytes, originalName: file.name });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('POST', url);
    xhr.send(fd);
  });
};

// ── Hook: upload one file ──────────────────────────────────────────────────
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState(null);

  const upload = useCallback(async (file, folder = 'lms/covers', resourceType = 'image') => {
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const { data: sig } = await api.get('/cloudinary/sign', { params: { folder, resource_type: resourceType } });
      if (!sig.success) throw new Error('Could not get upload signature');
      const result = await uploadOneFile(file, sig, setProgress);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}

// ── Hook: upload multiple files concurrently ───────────────────────────────
export function useCloudinaryMultiUpload() {
  const [items,  setItems]  = useState([]); // [{ file, status, progress, result, error }]
  const [busy,   setBusy]   = useState(false);

  const uploadAll = useCallback(async (files, folder = 'lms/gallery', resourceType = 'image') => {
    const fileArr = Array.from(files);
    if (!fileArr.length) return [];

    // Build initial state
    const initial = fileArr.map((file, i) => ({ id: i, file, status: 'pending', progress: 0, result: null, error: null }));
    setItems(initial);
    setBusy(true);

    // Get one signature (reuse for all files — timestamp is the same batch)
    let sig;
    try {
      const { data } = await api.get('/cloudinary/sign', { params: { folder, resource_type: resourceType } });
      if (!data.success) throw new Error('Could not get signature');
      sig = data;
    } catch (err) {
      setItems(prev => prev.map(i => ({ ...i, status: 'error', error: err.message })));
      setBusy(false);
      throw err;
    }

    // Upload all concurrently
    const results = await Promise.allSettled(
      initial.map(item =>
        uploadOneFile(item.file, sig, (pct) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct, status: 'uploading' } : i));
        }).then(result => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 100, status: 'done', result } : i));
          return result;
        }).catch(err => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
          throw err;
        })
      )
    );

    setBusy(false);
    return results.filter(r => r.status === 'fulfilled').map(r => r.value);
  }, []);

  const reset = () => setItems([]);

  return { uploadAll, items, busy, reset };
}
