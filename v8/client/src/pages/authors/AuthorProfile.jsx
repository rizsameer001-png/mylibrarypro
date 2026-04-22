import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl, imgOnError } from '../../utils/image';
import { LoadingSpinner } from '../../components/ui/index';
import { BookCard } from '../../components/ui/index';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  ArrowLeftIcon, PlayCircleIcon, SpeakerWaveIcon,
  DocumentTextIcon, StarIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ events }) {
  if (!events?.length) return null;
  const sorted = [...events].sort((a, b) => a.year - b.year);
  return (
    <div className="relative mt-4">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary-200" />
      <div className="space-y-5">
        {sorted.map((e, i) => (
          <div key={i} className="relative pl-10">
            <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-primary-600 border-2 border-white shadow" />
            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{e.year}</span>
              <p className="font-medium text-gray-900 mt-1 text-sm">{e.event}</p>
              {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── YouTube embed ──────────────────────────────────────────────────────────────
function YouTubeEmbed({ url, title }) {
  const getEmbedId = (url) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };
  const id = getEmbedId(url);
  if (!id) return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
      <PlayCircleIcon className="h-5 w-5 text-red-600" />
      <span className="text-sm text-gray-700 truncate">{title}</span>
    </a>
  );
  return (
    <div className="rounded-xl overflow-hidden shadow-sm">
      <p className="text-xs font-medium text-gray-700 mb-1.5 px-1">{title}</p>
      <div className="aspect-video">
        <iframe src={`https://www.youtube.com/embed/${id}`} title={title}
          className="w-full h-full rounded-lg" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AuthorProfile() {
  const { slug }     = useParams();
  const { formatPrice } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bioLang, setBioLang] = useState('en');
  const [tab, setTab]    = useState('books');
  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    api.get(`/authors/${slug}`)
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (!data)   return (
    <div className="text-center py-20">
      <p className="text-gray-500">Author not found.</p>
      <Link to="/authors" className="text-primary-600 text-sm mt-2 inline-block">← All Authors</Link>
    </div>
  );

  const { author, books } = data;
  const multiLang = author.multiBio?.filter(m => m.lang && m.bio) || [];
  const currentBio = multiLang.find(m => m.lang === bioLang)?.bio || author.fullBio || author.shortBio || '';

  const tabs = [
    { key: 'books',    label: `Books (${books?.length || 0})` },
    { key: 'videos',   label: `Videos (${author.youtubeLinks?.length || 0})` },
    { key: 'audio',    label: `Audio (${author.audioLinks?.length || 0})` },
    { key: 'articles', label: `Articles (${author.articles?.length || 0})` },
    { key: 'timeline', label: 'Timeline' },
  ].filter(t => {
    if (t.key === 'books')    return books?.length > 0;
    if (t.key === 'videos')   return author.youtubeLinks?.length > 0;
    if (t.key === 'audio')    return author.audioLinks?.length > 0;
    if (t.key === 'articles') return author.articles?.length > 0;
    if (t.key === 'timeline') return author.timeline?.length > 0;
    return true;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Link to="/authors" className="inline-flex items-center text-primary-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> All Authors
          </Link>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-36 w-36 rounded-2xl overflow-hidden border-4 border-primary-400/40 shadow-2xl bg-primary-700">
                <img src={getImageUrl(author.avatar)} alt={author.name}
                  className="h-full w-full object-cover object-top" onError={imgOnError} />
              </div>
            </div>
            {/* Meta */}
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-3xl font-bold">{author.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-primary-200">
                    {author.nationality && (
                      <span className="flex items-center space-x-1">
                        <GlobeAltIcon className="h-4 w-4" /><span>{author.nationality}</span>
                      </span>
                    )}
                    {(author.birthYear || author.deathYear) && (
                      <span>{author.birthYear || '?'}{author.deathYear ? ` – ${author.deathYear}` : ''}</span>
                    )}
                    {author.isFeatured && (
                      <span className="flex items-center space-x-1 text-yellow-400">
                        <StarSolid className="h-4 w-4" /><span>Featured Author</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-primary-300">
                  <p>{author.bookCount || books?.length || 0} books</p>
                </div>
              </div>

              {/* Genres + languages */}
              {author.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {author.genres.map(g => (
                    <span key={g} className="text-xs bg-white/15 text-white px-2.5 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              )}

              {/* Short bio */}
              {author.shortBio && (
                <p className="text-primary-100 text-sm mt-3 max-w-2xl leading-relaxed">{author.shortBio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left col: Full bio ──────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">Biography</h2>
                {/* Language switcher */}
                {multiLang.length > 0 && (
                  <select value={bioLang} onChange={e => setBioLang(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                    <option value="en">English</option>
                    {multiLang.map(m => (
                      <option key={m.lang} value={m.lang}>{m.lang.toUpperCase()}</option>
                    ))}
                  </select>
                )}
              </div>
              {currentBio ? (
                <>
                  <p className={`text-sm text-gray-600 leading-relaxed ${!bioOpen ? 'line-clamp-6' : ''}`}>
                    {currentBio}
                  </p>
                  {currentBio.length > 300 && (
                    <button onClick={() => setBioOpen(!bioOpen)}
                      className="text-xs text-primary-600 mt-2 hover:underline">
                      {bioOpen ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No biography available.</p>
              )}
            </div>

            {/* Quick facts */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Quick Facts</h2>
              <dl className="space-y-2 text-sm">
                {[
                  ['Born',        author.birthYear],
                  ['Died',        author.deathYear],
                  ['Nationality', author.nationality],
                  ['Genres',      author.genres?.join(', ')],
                  ['Languages',   author.languages?.join(', ')],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-gray-800 font-medium text-right max-w-[60%]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* ── Right col: tabs ─────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {tabs.length > 0 && (
              <>
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        tab === t.key ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Books */}
                {tab === 'books' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {books.map(book => (
                      <BookCard key={book._id} book={book}
                        priceDisplay={book.isDigitalSale ? formatPrice(book.digitalPrice) : null} />
                    ))}
                  </div>
                )}

                {/* Videos */}
                {tab === 'videos' && (
                  <div className="space-y-4">
                    {author.youtubeLinks?.map((v, i) => (
                      <YouTubeEmbed key={i} url={v.url} title={v.title || `Video ${i+1}`} />
                    ))}
                  </div>
                )}

                {/* Audio */}
                {tab === 'audio' && (
                  <div className="space-y-3">
                    {author.audioLinks?.map((a, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <SpeakerWaveIcon className="h-8 w-8 text-primary-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                          {a.duration && <p className="text-xs text-gray-400">{a.duration}</p>}
                        </div>
                        <a href={a.url} target="_blank" rel="noreferrer"
                          className="text-xs btn-secondary px-3 py-1.5">Listen</a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Articles */}
                {tab === 'articles' && (
                  <div className="space-y-3">
                    {author.articles?.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer"
                        className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary-300 transition-colors group">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{a.title}</p>
                          {a.source && <p className="text-xs text-gray-400 mt-0.5">{a.source}</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Timeline */}
                {tab === 'timeline' && <Timeline events={author.timeline} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
