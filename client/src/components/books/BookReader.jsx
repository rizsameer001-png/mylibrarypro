/**
 * BookReader
 * In-browser reading experience.
 * - PDF: rendered via <iframe> with a signed S3 URL (safest cross-browser approach).
 * - Progress bar + page tracker saved back to server every 10 s.
 * - Notes panel (slide-in).
 * - Fullscreen toggle.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon,
  BookmarkIcon, XMarkIcon, PlusIcon,
} from '@heroicons/react/24/outline';

export default function BookReader({ bookId, onClose }) {
  const [state, setState]       = useState('loading');   // loading | ready | error
  const [pdfUrl, setPdfUrl]     = useState(null);
  const [totalPages, setTotalPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [notesOpen, setNotesOpen]   = useState(false);
  const [notes, setNotes]           = useState([]);
  const [noteText, setNoteText]     = useState('');
  const [notePage, setNotePage]     = useState(1);
  const [addingNote, setAddingNote] = useState(false);
  const saveTimer = useRef(null);
  const wrapRef   = useRef(null);

  // ── Fetch signed URL ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/digital/${bookId}/read`)
      .then(({ data }) => {
        setPdfUrl(data.url);
        setTotalPages(data.totalPages);
        setState('ready');
      })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Cannot open reader');
        setState('error');
      });

    return () => clearTimeout(saveTimer.current);
  }, [bookId]);

  // ── Auto-save progress every 10 s ───────────────────────────────────────────
  const saveProgress = useCallback(() => {
    if (!totalPages) return;
    api.put(`/digital/${bookId}/progress`, { currentPage, totalPages }).catch(() => {});
  }, [bookId, currentPage, totalPages]);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveProgress, 10_000);
  }, [currentPage, saveProgress]);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // ── Notes ────────────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await api.post(`/digital/${bookId}/notes`, { page: notePage, text: noteText });
      setNotes(data.notes);
      setNoteText('');
      toast.success('Note saved');
    } catch { toast.error('Failed to save note'); }
    finally { setAddingNote(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Opening book…</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-4">Could not open this book.</p>
          <button onClick={onClose} className="px-4 py-2 bg-white text-gray-900 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const progress = totalPages ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div ref={wrapRef} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button onClick={() => { saveProgress(); onClose(); }}
            className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
          {/* Progress */}
          <div className="flex items-center space-x-2">
            <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
        </div>

        {/* Page nav */}
        {totalPages && (
          <div className="flex items-center space-x-2 text-white text-sm">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1} className="px-2 py-0.5 bg-gray-700 rounded disabled:opacity-40 hover:bg-gray-600">‹</button>
            <span className="text-gray-300 text-xs">
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages} className="px-2 py-0.5 bg-gray-700 rounded disabled:opacity-40 hover:bg-gray-600">›</button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button onClick={() => setNotesOpen(!notesOpen)}
            className="text-gray-400 hover:text-white transition-colors" title="Notes">
            <BookmarkIcon className="h-5 w-5" />
          </button>
          <button onClick={toggleFullscreen}
            className="text-gray-400 hover:text-white transition-colors">
            {fullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Reader body */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${pdfUrl}#page=${currentPage}`}
            title="Book Reader"
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        </div>

        {/* Notes panel */}
        {notesOpen && (
          <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white text-sm font-medium">My Notes</h3>
              <button onClick={() => setNotesOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notes.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No notes yet</p>
              )}
              {notes.map((n, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-xs text-primary-400 mb-1">Page {n.page}</p>
                  <p className="text-xs text-gray-300">{n.text}</p>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="p-3 border-t border-gray-700 space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400 w-10">Page</label>
                <input type="number" min="1" max={totalPages || 9999} value={notePage}
                  onChange={e => setNotePage(parseInt(e.target.value) || 1)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500" />
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note…"
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none" />
              <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                className="w-full flex items-center justify-center space-x-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors">
                <PlusIcon className="h-3.5 w-3.5" />
                <span>{addingNote ? 'Saving…' : 'Add Note'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
