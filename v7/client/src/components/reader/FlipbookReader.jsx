/**
 * FlipbookReader — Full-screen reading experience
 *
 * Two modes (toggle via gear icon):
 *   Basic:    PDF iframe viewer (always works, any format)
 *   Advanced: Page-flip animation + TTS + sentence highlight + speed control
 *
 * Features:
 *   ✅ Page-flip animation (react-pageflip, only in advanced mode)
 *   ✅ Voice narration (Web Speech API) with sentence highlight + auto-scroll
 *   ✅ Speed control 0.5×–2×
 *   ✅ Bookmarks with page jump
 *   ✅ Progress bar + % + estimated time remaining
 *   ✅ Progress persisted (page + sentence) – resume where left off
 *   ✅ Offline-ready (PWA caches assets)
 *   ✅ Fullscreen toggle
 *   ✅ Keyboard shortcuts (← → Space)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useReader } from './useReader';
import {
  XMarkIcon, BookmarkIcon, SpeakerWaveIcon, BackwardIcon, ForwardIcon,
  ArrowsPointingOutIcon, ArrowsPointingInIcon, Cog6ToothIcon,
  ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon,
  StopIcon, ClockIcon, AdjustmentsHorizontalIcon, ListBulletIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';

// ── Lazy-load react-pageflip (only in advanced mode) ─────────────────────────
let HTMLFlipBook = null;

// ── Sentence paragraph ────────────────────────────────────────────────────────
function SentenceText({ sentences, activeSentence, sentenceRefs }) {
  return (
    <div className="text-gray-800 leading-relaxed text-[17px] space-y-1 select-none">
      {sentences.map((s, i) => (
        <span
          key={i}
          ref={el => { if (sentenceRefs.current) sentenceRefs.current[i] = el; }}
          className={`inline transition-all duration-200 rounded px-0.5 ${
            i === activeSentence
              ? 'bg-yellow-300 text-gray-900 font-medium shadow-sm'
              : 'text-gray-800'
          }`}
        >
          {s}{' '}
        </span>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FlipbookReader({ bookId, onClose }) {
  const reader = useReader(bookId);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks,setShowBookmarks]= useState(false);
  const [bmLabel,      setBmLabel]      = useState('');
  const [showBmInput,  setShowBmInput]  = useState(false);
  const [FlipLoaded,   setFlipLoaded]   = useState(false);

  const wrapRef      = useRef(null);
  const flipRef      = useRef(null);
  const sentenceRefs = useRef({});
  const pageInputRef = useRef(null);

  // ── Load react-pageflip lazily ─────────────────────────────────────────────
  useEffect(() => {
    if (advancedMode && !FlipLoaded) {
      import('react-pageflip').then(mod => {
        HTMLFlipBook = mod.default;
        setFlipLoaded(true);
      }).catch(() => {});
    }
  }, [advancedMode]);

  // ── Auto-scroll active sentence into view ─────────────────────────────────
  useEffect(() => {
    const el = sentenceRefs.current[reader.activeSentence];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [reader.activeSentence]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') reader.nextPage();
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   reader.prevPage();
      if (e.key === ' ') {
        e.preventDefault();
        reader.ttsPlaying ? reader.pauseTts() : (reader.ttsEnabled ? reader.startReading() : null);
      }
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [reader.ttsPlaying, reader.ttsEnabled]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (reader.loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Opening reader…</p>
        </div>
      </div>
    );
  }

  if (reader.error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">{reader.error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-white text-gray-900 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const { initData, pageContent, hasTextContent } = reader;
  const book = initData?.book;
  const sentences = pageContent?.sentences || [];
  const estRemaining = reader.totalPages > 0
    ? Math.max(0, Math.ceil(((reader.totalPages - reader.currentPage) * (pageContent?.estimatedSeconds || 90)) / 60))
    : null;

  return (
    <div ref={wrapRef} className="fixed inset-0 z-50 bg-gray-950 flex flex-col text-white select-none">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        {/* Left: close + title */}
        <div className="flex items-center space-x-3 min-w-0">
          <button onClick={() => { reader.saveNow(); onClose?.(); }}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate max-w-xs">{book?.title}</p>
            <p className="text-xs text-gray-400">{book?.authors?.map(a=>a.name).join(', ')}</p>
          </div>
        </div>

        {/* Center: progress */}
        <div className="hidden sm:flex items-center space-x-3 flex-shrink-0">
          <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${reader.progress}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-10 text-right">{reader.progress}%</span>
          {estRemaining !== null && (
            <span className="text-xs text-gray-500 flex items-center space-x-1">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>~{estRemaining}m left</span>
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {hasTextContent && (
            <button onClick={() => setAdvancedMode(!advancedMode)}
              title={advancedMode ? 'Switch to PDF view' : 'Switch to Flipbook'}
              className={`p-1.5 rounded-lg transition-colors text-xs font-medium px-2.5 ${advancedMode ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              {advancedMode ? '📖 Flip' : '📄 PDF'}
            </button>
          )}
          <button onClick={() => setShowBookmarks(!showBookmarks)}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700">
            <ListBulletIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700">
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700">
            {fullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Settings panel ──────────────────────────────────────────────── */}
      {showSettings && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex flex-wrap gap-4 items-center">
          {/* TTS toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <div onClick={() => reader.setTtsEnabled(!reader.ttsEnabled)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${reader.ttsEnabled ? 'bg-primary-600' : 'bg-gray-600'}`}>
              <span className={`inline-block h-3.5 w-3.5 mt-0.5 transform rounded-full bg-white shadow transition-transform ${reader.ttsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-300">Voice Narration</span>
          </label>

          {/* Speed */}
          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">Speed:</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
              <button key={s} onClick={() => reader.setTtsSpeed(s)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  reader.ttsSpeed === s ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                }`}>{s}×</button>
            ))}
          </div>

          {/* Voice selector */}
          {reader.voices.length > 0 && (
            <div className="flex items-center space-x-2">
              <SpeakerWaveIcon className="h-4 w-4 text-gray-400" />
              <select value={reader.ttsVoice} onChange={e => reader.setTtsVoice(e.target.value)}
                className="bg-gray-800 text-xs text-gray-200 border border-gray-700 rounded-lg px-2 py-1 max-w-[200px]">
                <option value="">Default voice</option>
                {reader.voices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Bookmarks panel ─────────────────────────────────────────────── */}
      {showBookmarks && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300">Bookmarks ({reader.bookmarks.length})</span>
            {showBmInput ? (
              <div className="flex items-center space-x-2">
                <input value={bmLabel} onChange={e => setBmLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-36" />
                <button onClick={() => { reader.addBookmark(bmLabel); setBmLabel(''); setShowBmInput(false); }}
                  className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Add</button>
                <button onClick={() => setShowBmInput(false)} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowBmInput(true)}
                disabled={reader.isPageBookmarked}
                className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-40">
                + Add bookmark (p.{reader.currentPage})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {reader.bookmarks.length === 0 && <span className="text-xs text-gray-500">No bookmarks yet</span>}
            {reader.bookmarks.map(bm => (
              <div key={bm._id} className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
                <button onClick={() => reader.goToPage(bm.page)}
                  className="text-xs text-yellow-400 hover:text-yellow-300">
                  p.{bm.page}{bm.label ? ` · ${bm.label}` : ''}
                </button>
                <button onClick={() => reader.removeBookmark(bm._id)} className="text-gray-600 hover:text-red-400 ml-1">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main reading area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">

        {/* ADVANCED MODE: Text + Flipbook animation */}
        {advancedMode && hasTextContent ? (
          <div className="h-full flex items-center justify-center bg-amber-50">
            {FlipLoaded && HTMLFlipBook ? (
              <HTMLFlipBook
                ref={flipRef}
                width={420} height={580}
                size="fixed"
                minWidth={280} maxWidth={700}
                minHeight={400} maxHeight={800}
                showCover
                mobileScrollSupport
                onFlip={e => reader.goToPage(e.data + 1)}
                className="shadow-2xl"
                style={{}}
                startPage={reader.currentPage - 1}
                drawShadow
                flippingTime={700}
                usePortrait={window.innerWidth < 640}
              >
                {/* We render ALL pages but only load content lazily */}
                {Array.from({ length: reader.totalPages || 1 }, (_, i) => (
                  <div key={i} className="bg-[#fefdf8] p-8 overflow-hidden h-full">
                    {i + 1 === reader.currentPage ? (
                      reader.pageLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
                        </div>
                      ) : pageContent ? (
                        <>
                          <p className="text-xs text-amber-600 mb-4 font-medium">Page {i + 1}</p>
                          <SentenceText
                            sentences={sentences}
                            activeSentence={reader.activeSentence}
                            sentenceRefs={sentenceRefs}
                          />
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm">Loading…</p>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-300 text-sm">Page {i + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </HTMLFlipBook>
            ) : (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
            )}
          </div>
        ) : advancedMode && hasTextContent ? null :

        /* BASIC MODE: PDF iframe */
        initData?.pdfUrl ? (
          <iframe
            src={`${initData.pdfUrl}#page=${reader.currentPage}`}
            title={book?.title}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">No readable content available</p>
              <p className="text-sm mt-1">Contact administrator to upload a digital file</p>
            </div>
          </div>
        )}

        {/* Advanced text mode without flip (loading) */}
        {advancedMode && hasTextContent && !FlipLoaded && (
          <div className="absolute inset-0 bg-[#fefdf8] flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-3" />
            <p className="text-amber-700 text-sm">Loading flipbook…</p>
          </div>
        )}

        {/* Page navigation arrows */}
        <button onClick={reader.prevPage} disabled={reader.currentPage <= 1}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors disabled:opacity-20">
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <button onClick={reader.nextPage} disabled={reader.currentPage >= (reader.totalPages || 9999)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors disabled:opacity-20">
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2.5 flex items-center justify-between gap-4">

        {/* Page nav */}
        <div className="flex items-center space-x-2 text-sm">
          <button onClick={reader.prevPage} disabled={reader.currentPage <= 1}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 text-xs">Page</span>
            <input
              ref={pageInputRef}
              type="number"
              min={1} max={reader.totalPages || 9999}
              value={reader.currentPage}
              onChange={e => reader.goToPage(parseInt(e.target.value) || 1)}
              className="w-12 text-center bg-gray-800 border border-gray-700 rounded text-xs py-0.5 text-white"
            />
            <span className="text-gray-500 text-xs">/ {reader.totalPages || '?'}</span>
          </div>
          <button onClick={reader.nextPage} disabled={reader.currentPage >= (reader.totalPages || 9999)}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* TTS controls (only when text content exists) */}
        {hasTextContent && reader.ttsEnabled && (
          <div className="flex items-center space-x-2">
            <button onClick={() => reader.ttsPlaying ? reader.pauseTts() : reader.startReading()}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                reader.ttsPlaying ? 'bg-yellow-500 text-gray-900' : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}>
              {reader.ttsPlaying
                ? <><PauseIcon className="h-4 w-4" /><span>Pause</span></>
                : <><PlayIcon  className="h-4 w-4" /><span>Read Aloud</span></>
              }
            </button>
            {reader.ttsPlaying && (
              <button onClick={reader.stopTts}
                className="p-1.5 text-gray-400 hover:text-white transition-colors">
                <StopIcon className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs text-gray-500">{reader.ttsSpeed}×</span>
          </div>
        )}

        {/* Bookmark current page */}
        <button onClick={() => reader.isPageBookmarked ? null : reader.addBookmark()}
          title={reader.isPageBookmarked ? 'Page bookmarked' : 'Bookmark this page'}
          className="transition-colors">
          {reader.isPageBookmarked
            ? <BookmarkSolid className="h-5 w-5 text-yellow-400" />
            : <BookmarkIcon  className="h-5 w-5 text-gray-400 hover:text-yellow-400" />
          }
        </button>
      </div>
    </div>
  );
}
