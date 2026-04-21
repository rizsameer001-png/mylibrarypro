/**
 * useReader — centralised state + logic for the Flipbook reader.
 * Handles: progress sync, TTS (Web Speech API), bookmarks, auto-save.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';

const SAVE_INTERVAL_MS = 8000;  // auto-save every 8 s

export function useReader(bookId) {
  // ── Init state ─────────────────────────────────────────────────────────────
  const [initData,   setInitData]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Page state ─────────────────────────────────────────────────────────────
  const [currentPage,     setCurrentPage]     = useState(1);
  const [totalPages,      setTotalPages]       = useState(0);
  const [pageContent,     setPageContent]      = useState(null);   // { text, sentences, wordCount }
  const [pageLoading,     setPageLoading]      = useState(false);
  const [hasTextContent,  setHasTextContent]   = useState(false);

  // ── TTS state ──────────────────────────────────────────────────────────────
  const [ttsEnabled,      setTtsEnabled]      = useState(false);
  const [ttsPlaying,      setTtsPlaying]      = useState(false);
  const [ttsSpeed,        setTtsSpeed]        = useState(1.0);
  const [ttsVoice,        setTtsVoice]        = useState('');
  const [voices,          setVoices]          = useState([]);
  const [activeSentence,  setActiveSentence]  = useState(-1);

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  const [bookmarks,       setBookmarks]       = useState([]);

  // ── Progress ───────────────────────────────────────────────────────────────
  const [progress,        setProgress]        = useState(0);
  const [secondsRead,     setSecondsRead]     = useState(0);

  const utteranceRef  = useRef(null);
  const sentenceIdx   = useRef(0);
  const saveTimerRef  = useRef(null);
  const clockRef      = useRef(null);

  // ── Load voices ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    api.get(`/reader/${bookId}/init`)
      .then(({ data }) => {
        setInitData(data);
        setCurrentPage(data.session.currentPage || 1);
        setTotalPages(data.book.totalPages || 0);
        setProgress(data.session.progress || 0);
        setTtsSpeed(data.session.ttsSpeed || 1.0);
        setTtsVoice(data.session.ttsVoice || '');
        setTtsEnabled(data.session.ttsEnabled || false);
        setBookmarks(data.bookmarks || []);
        setHasTextContent(data.hasTextContent);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load book');
        setLoading(false);
      });
  }, [bookId]);

  // ── Load page text content ─────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId || !hasTextContent) return;
    setPageLoading(true);
    api.get(`/reader/${bookId}/page/${currentPage}`)
      .then(({ data }) => {
        setPageContent(data.page);
        setActiveSentence(-1);
        if (data.totalPages && !totalPages) setTotalPages(data.totalPages);
      })
      .catch(() => setPageContent(null))
      .finally(() => setPageLoading(false));
  }, [bookId, currentPage, hasTextContent]);

  // ── Progress calc ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (totalPages > 0) {
      setProgress(Math.min(100, Math.round((currentPage / totalPages) * 100)));
    }
  }, [currentPage, totalPages]);

  // ── Clock: count seconds while reading ────────────────────────────────────
  useEffect(() => {
    clockRef.current = setInterval(() => setSecondsRead(s => s + 1), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const doSave = useCallback((page, sentence, secs) => {
    api.put(`/reader/${bookId}/progress`, {
      currentPage:     page,
      currentSentence: sentence,
      totalPages,
      ttsSpeed,
      ttsVoice,
      ttsEnabled,
      secondsRead: secs,
    }).catch(() => {});
    setSecondsRead(0);
  }, [bookId, totalPages, ttsSpeed, ttsVoice, ttsEnabled]);

  useEffect(() => {
    clearInterval(saveTimerRef.current);
    saveTimerRef.current = setInterval(() => {
      doSave(currentPage, sentenceIdx.current, secondsRead);
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(saveTimerRef.current);
  }, [doSave, currentPage, secondsRead]);

  // Save on unmount
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    doSave(currentPage, sentenceIdx.current, secondsRead);
  }, []);

  // ── TTS: speak all sentences on a page ────────────────────────────────────
  const speakPage = useCallback((sentences, startIdx = 0) => {
    window.speechSynthesis?.cancel();
    if (!sentences?.length) return;

    const readFrom = (idx) => {
      if (idx >= sentences.length) {
        setTtsPlaying(false);
        setActiveSentence(-1);
        return;
      }
      sentenceIdx.current = idx;
      setActiveSentence(idx);

      const utt = new SpeechSynthesisUtterance(sentences[idx]);
      utt.rate  = ttsSpeed;
      if (ttsVoice) {
        const v = window.speechSynthesis.getVoices().find(v => v.name === ttsVoice);
        if (v) utt.voice = v;
      }
      utt.onend = () => readFrom(idx + 1);
      utt.onerror = () => { setTtsPlaying(false); setActiveSentence(-1); };
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    };

    setTtsPlaying(true);
    readFrom(startIdx);
  }, [ttsSpeed, ttsVoice]);

  const pauseTts  = () => { window.speechSynthesis?.pause();  setTtsPlaying(false); };
  const resumeTts = () => { window.speechSynthesis?.resume(); setTtsPlaying(true);  };
  const stopTts   = () => { window.speechSynthesis?.cancel(); setTtsPlaying(false); setActiveSentence(-1); };

  const startReading = useCallback((fromSentence = 0) => {
    if (pageContent?.sentences) speakPage(pageContent.sentences, fromSentence);
  }, [pageContent, speakPage]);

  // ── Page navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((p) => {
    stopTts();
    const clamped = Math.max(1, Math.min(totalPages || 9999, p));
    setCurrentPage(clamped);
    doSave(clamped, 0, secondsRead);
  }, [totalPages, doSave, secondsRead]);

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  const addBookmark = useCallback(async (label = '', color = 'yellow') => {
    const existing = bookmarks.find(b => b.page === currentPage);
    if (existing) return;
    const { data } = await api.post(`/reader/${bookId}/bookmarks`, { page: currentPage, label, color });
    setBookmarks(prev => [...prev, data.bookmark].sort((a, b) => a.page - b.page));
  }, [bookId, bookmarks, currentPage]);

  const removeBookmark = useCallback(async (bmId) => {
    await api.delete(`/reader/${bookId}/bookmarks/${bmId}`);
    setBookmarks(prev => prev.filter(b => b._id !== bmId));
  }, [bookId]);

  const isPageBookmarked = bookmarks.some(b => b.page === currentPage);

  return {
    // state
    loading, error, initData,
    currentPage, totalPages, progress,
    pageContent, pageLoading, hasTextContent,
    ttsEnabled, setTtsEnabled,
    ttsPlaying, ttsSpeed, setTtsSpeed,
    ttsVoice, setTtsVoice, voices,
    activeSentence,
    bookmarks, isPageBookmarked,
    secondsRead,
    // actions
    goToPage, nextPage, prevPage,
    startReading, pauseTts, resumeTts, stopTts,
    addBookmark, removeBookmark,
    saveNow: () => doSave(currentPage, sentenceIdx.current, secondsRead),
  };
}
