/**
 * readerController.js
 *
 * Powers the Flipbook / Read-Aloud reader.
 * Provides:
 *   - Text content page-by-page (for TTS + sentence highlighting)
 *   - Reading session state (page, sentence, progress, speed, voice)
 *   - Bookmark CRUD
 *   - Progress heartbeat
 */
const Book = require('../models/Book');
const { ReadingSession, Bookmark, ReadingContent } = require('../models/digital');
const { getCloudinarySignedUrl } = require('../utils/cloudinary');

// ── Avg reading speed: 200 words/min ────────────────────────────────────────
const WPM = 200;

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reader/:bookId/init
//  Returns: book meta, signed PDF url, reading session state, bookmarks
// ─────────────────────────────────────────────────────────────────────────────
const initReader = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId)
      .populate('authors', 'name')
      .populate('categories', 'name');

    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    // Access check
    if (!book.readingEnabled) {
      return res.status(403).json({ success: false, message: 'Reading not enabled for this book' });
    }

    // Signed URL for PDF
    let pdfUrl = null;
    if (book.cloudinaryPublicId) {
      pdfUrl = getCloudinarySignedUrl(book.cloudinaryPublicId, 'raw');
    } else if (book.ebookFile) {
      pdfUrl = `/${book.ebookFile}`;
    }

    // Upsert session
    let session = await ReadingSession.findOneAndUpdate(
      { book: book._id, member: req.user._id },
      { lastReadAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Bookmarks
    const bookmarks = await Bookmark.find({ book: book._id, member: req.user._id }).sort('page');

    // Text content (if extracted)
    const content = await ReadingContent.findOne({ book: book._id });

    // Estimated reading time
    const estimatedMinutes = content?.totalWords
      ? Math.ceil(content.totalWords / WPM)
      : book.readingPageCount
        ? Math.ceil((book.readingPageCount * 250) / WPM) // ~250 words/page avg
        : null;

    res.json({
      success: true,
      book: {
        _id: book._id,
        title: book.title,
        authors: book.authors,
        coverImage: book.coverImage,
        totalPages: book.readingPageCount || content?.totalPages,
        ebookFormat: book.ebookFormat,
        estimatedMinutes,
      },
      pdfUrl,
      session: {
        currentPage:         session.currentPage,
        currentSentence:     session.currentSentence,
        progress:            session.progress,
        ttsSpeed:            session.ttsSpeed,
        ttsVoice:            session.ttsVoice,
        ttsEnabled:          session.ttsEnabled,
        totalReadingSeconds: session.totalReadingSeconds,
        completed:           session.completed,
      },
      bookmarks,
      hasTextContent: !!content,
      totalTextPages: content?.totalPages || 0,
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reader/:bookId/page/:pageNum
//  Returns text sentences for a single page (for TTS + highlight)
// ─────────────────────────────────────────────────────────────────────────────
const getPage = async (req, res, next) => {
  try {
    const { bookId, pageNum } = req.params;
    const content = await ReadingContent.findOne({ book: bookId });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Text content not available. PDF viewer will be used.',
        fallback: 'pdf',
      });
    }

    const page = content.pages.find(p => p.pageNum === parseInt(pageNum));
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

    // Split into sentences for TTS highlight
    const sentences = splitSentences(page.text);

    res.json({
      success: true,
      page: {
        pageNum: page.pageNum,
        text:    page.text,
        sentences,
        wordCount: page.wordCount,
        estimatedSeconds: Math.ceil((page.wordCount / WPM) * 60),
      },
      totalPages: content.totalPages,
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/reader/:bookId/content
//  Admin: save/replace extracted text content (manual or from extraction tool)
// ─────────────────────────────────────────────────────────────────────────────
const saveContent = async (req, res, next) => {
  try {
    const { pages } = req.body;   // [{ pageNum, text }]
    if (!Array.isArray(pages) || !pages.length) {
      return res.status(400).json({ success: false, message: 'pages array required' });
    }

    const enriched = pages.map(p => {
      const words = (p.text || '').trim().split(/\s+/).filter(Boolean).length;
      return { pageNum: p.pageNum, text: p.text || '', wordCount: words };
    });

    const totalWords = enriched.reduce((s, p) => s + p.wordCount, 0);

    const content = await ReadingContent.findOneAndUpdate(
      { book: req.params.bookId },
      {
        pages:      enriched,
        totalWords,
        totalPages: enriched.length,
        extractedAt: new Date(),
        sourceType: req.body.sourceType || 'manual',
      },
      { upsert: true, new: true }
    );

    // Update Book.readingPageCount
    await Book.findByIdAndUpdate(req.params.bookId, {
      readingPageCount: enriched.length,
    });

    res.json({
      success: true,
      totalPages: content.totalPages,
      totalWords,
      estimatedMinutes: Math.ceil(totalWords / WPM),
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/reader/:bookId/progress
//  Save current page, sentence, timing, TTS prefs
// ─────────────────────────────────────────────────────────────────────────────
const saveProgress = async (req, res, next) => {
  try {
    const {
      currentPage, currentSentence, totalPages,
      ttsSpeed, ttsVoice, ttsEnabled,
      secondsRead = 0,
    } = req.body;

    const progress = totalPages
      ? Math.min(100, Math.round((currentPage / totalPages) * 100))
      : 0;

    const session = await ReadingSession.findOneAndUpdate(
      { book: req.params.bookId, member: req.user._id },
      {
        currentPage:     currentPage || 1,
        currentSentence: currentSentence || 0,
        totalPages,
        progress,
        lastReadAt: new Date(),
        completed:  progress >= 100,
        ...(ttsSpeed   !== undefined ? { ttsSpeed }   : {}),
        ...(ttsVoice   !== undefined ? { ttsVoice }   : {}),
        ...(ttsEnabled !== undefined ? { ttsEnabled }  : {}),
        $inc: { totalReadingSeconds: secondsRead },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, progress, completed: session.completed });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Bookmarks
// ─────────────────────────────────────────────────────────────────────────────
const getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ book: req.params.bookId, member: req.user._id }).sort('page');
    res.json({ success: true, bookmarks });
  } catch (e) { next(e); }
};

const addBookmark = async (req, res, next) => {
  try {
    const { page, label = '', color = 'yellow' } = req.body;
    const bookmark = await Bookmark.create({
      book: req.params.bookId, member: req.user._id, page, label, color,
    });
    res.status(201).json({ success: true, bookmark });
  } catch (e) { next(e); }
};

const deleteBookmark = async (req, res, next) => {
  try {
    await Bookmark.findOneAndDelete({ _id: req.params.bmId, member: req.user._id });
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: split text into sentences
// ─────────────────────────────────────────────────────────────────────────────
function splitSentences(text) {
  if (!text) return [];
  // Split on ., !, ? followed by space/newline; preserve abbreviations roughly
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

module.exports = {
  initReader, getPage, saveContent, saveProgress,
  getBookmarks, addBookmark, deleteBookmark,
};
