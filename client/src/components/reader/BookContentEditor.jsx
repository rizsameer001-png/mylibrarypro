/**
 * BookContentEditor — Admin panel component
 * Allows admin to enter/paste text content page-by-page for a book.
 * This feeds the TTS + sentence-highlight system.
 * Also provides a word-count and estimated reading time per page.
 */
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';

const WPM = 200;
const wordCount = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
const estSecs   = (t) => Math.ceil((wordCount(t) / WPM) * 60);

export default function BookContentEditor({ bookId, onSaved }) {
  const [pages,   setPages]   = useState([{ pageNum: 1, text: '' }]);
  const [saving,  setSaving]  = useState(false);
  const [existing,setExisting]= useState(null);

  useEffect(() => {
    api.get(`/reader/${bookId}/page/1`)
      .then(({ data }) => {
        if (data.success) {
          // load all pages (try 1…totalPages)
          const total = data.totalPages;
          const arr   = [{ pageNum: 1, text: data.page.text }];
          setPages(arr);
          // lazy-load rest
          for (let p = 2; p <= Math.min(total, 50); p++) {
            api.get(`/reader/${bookId}/page/${p}`)
              .then(r => {
                setPages(prev => {
                  const next = [...prev];
                  const idx  = next.findIndex(x => x.pageNum === r.data.page.pageNum);
                  if (idx >= 0) next[idx] = { pageNum: r.data.page.pageNum, text: r.data.page.text };
                  else next.push({ pageNum: r.data.page.pageNum, text: r.data.page.text });
                  return next.sort((a,b) => a.pageNum - b.pageNum);
                });
              }).catch(() => {});
          }
          setExisting(true);
        }
      }).catch(() => {});
  }, [bookId]);

  const addPage = () => {
    const next = (pages[pages.length - 1]?.pageNum || 0) + 1;
    setPages([...pages, { pageNum: next, text: '' }]);
  };

  const removePage = (i) => setPages(pages.filter((_, idx) => idx !== i));

  const updateText = (i, text) => setPages(prev => prev.map((p, idx) => idx === i ? { ...p, text } : p));

  const handleSave = async () => {
    const valid = pages.filter(p => p.text.trim().length > 0);
    if (!valid.length) { toast.error('Add at least one page with content'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/reader/${bookId}/content`, {
        pages:      valid.map(p => ({ pageNum: p.pageNum, text: p.text })),
        sourceType: 'manual',
      });
      toast.success(`Saved ${data.totalPages} pages · ~${data.estimatedMinutes} min read`);
      onSaved?.(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const totalWords = pages.reduce((s, p) => s + wordCount(p.text), 0);
  const totalMins  = Math.ceil(totalWords / WPM);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-600">{totalWords.toLocaleString()} words</span>
          <span className="flex items-center space-x-1 text-primary-700">
            <ClockIcon className="h-4 w-4" />
            <span>~{totalMins} min read</span>
          </span>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving…' : existing ? 'Update Content' : 'Save Content'}
        </button>
      </div>

      {/* Pages */}
      {pages.map((page, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-gray-700">Page {page.pageNum}</span>
              <span className="text-xs text-gray-400">{wordCount(page.text)} words · ~{estSecs(page.text)}s</span>
            </div>
            <button onClick={() => removePage(i)} disabled={pages.length === 1}
              className="text-red-400 hover:text-red-600 disabled:opacity-30">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={page.text}
            onChange={e => updateText(i, e.target.value)}
            placeholder={`Enter or paste text for page ${page.pageNum}…\n\nTip: Separate into natural reading chunks. One paragraph per page works well.`}
            className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none border-0 focus:outline-none min-h-[160px]"
            rows={7}
          />
        </div>
      ))}

      <button onClick={addPage}
        className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-3 flex items-center justify-center space-x-2 text-gray-400 hover:text-primary-600 transition-colors text-sm">
        <PlusIcon className="h-4 w-4" />
        <span>Add Page</span>
      </button>
    </div>
  );
}
