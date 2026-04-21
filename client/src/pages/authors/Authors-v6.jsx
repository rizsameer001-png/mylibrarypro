import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl, imgOnError } from '../../utils/image';
import { LoadingSpinner, Pagination } from '../../components/ui/index';
import { MagnifyingGlassIcon, StarIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ── Author Card ───────────────────────────────────────────────────────────────
function AuthorCard({ author }) {
  return (
    <Link to={`/authors/${author.slug || author._id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Avatar */}
      <div className="relative h-48 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
        <img
          src={getImageUrl(author.avatar)}
          alt={author.name}
          className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          onError={imgOnError}
          loading="lazy"
        />
        {author.isFeatured && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-yellow-500 text-white text-xs flex items-center space-x-1">
              <StarSolid className="h-3 w-3" /><span>Featured</span>
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{author.name}</h3>
        {author.nationality && (
          <p className="text-xs text-gray-500 mt-0.5">{author.nationality}
            {(author.birthYear || author.deathYear) && (
              <span className="ml-1 text-gray-400">
                · {author.birthYear || '?'}{author.deathYear ? `–${author.deathYear}` : ''}
              </span>
            )}
          </p>
        )}
        {author.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {author.genres.slice(0, 2).map(g => (
              <span key={g} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{g}</span>
            ))}
          </div>
        )}
        {author.shortBio && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">{author.shortBio}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400 flex items-center space-x-1">
            <BookOpenIcon className="h-3.5 w-3.5" />
            <span>{author.bookCount || 0} book{author.bookCount !== 1 ? 's' : ''}</span>
          </span>
          <span className="text-xs text-primary-600 font-medium group-hover:underline">View profile →</span>
        </div>
      </div>
    </Link>
  );
}

// ── Featured strip ────────────────────────────────────────────────────────────
function FeaturedStrip({ authors }) {
  if (!authors.length) return null;
  return (
    <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-10 mb-10">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
          <StarSolid className="h-5 w-5 text-yellow-400" />
          <span>Featured Authors</span>
        </h2>
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
          {authors.map(a => (
            <Link key={a._id} to={`/authors/${a.slug || a._id}`}
              className="flex-shrink-0 w-36 text-center group">
              <div className="h-24 w-24 mx-auto rounded-full overflow-hidden border-2 border-yellow-400 bg-primary-700 mb-2">
                <img src={getImageUrl(a.avatar)} alt={a.name}
                  className="h-full w-full object-cover object-top group-hover:scale-110 transition-transform"
                  onError={imgOnError} loading="lazy" />
              </div>
              <p className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors leading-tight">{a.name}</p>
              {a.nationality && <p className="text-xs text-primary-300 mt-0.5">{a.nationality}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Authors() {
  const [authors,   setAuthors]   = useState([]);
  const [featured,  setFeatured]  = useState([]);
  const [facets,    setFacets]    = useState({ genres: [], languages: [] });
  const [letters,   setLetters]   = useState([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading,   setLoading]   = useState(true);

  const [search,   setSearch]   = useState('');
  const [genre,    setGenre]    = useState('');
  const [language, setLanguage] = useState('');
  const [letter,   setLetter]   = useState('');
  const [sort,     setSort]     = useState('name');
  const [page,     setPage]     = useState(1);

  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/authors/featured').then(({ data }) => setFeatured(data.authors)).catch(() => {});
    api.get('/authors/letters').then(({ data }) => setLetters(data.letters)).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchAuthors, search ? 350 : 0);
    return () => clearTimeout(searchTimer.current);
  }, [search, genre, language, letter, sort, page]);

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ sort, page, limit: 9 }); //pagination
      if (search)   p.set('search',   search);
      if (genre)    p.set('genre',    genre);
      if (language) p.set('language', language);
      if (letter)   p.set('letter',   letter);
      const { data } = await api.get(`/authors?${p}`);
      setAuthors(data.authors);
      setPagination(data.pagination);
      if (data.facets) setFacets(data.facets);
    } catch {}
    finally { setLoading(false); }
  };

  const setLetterFilter = (l) => {
    setLetter(prev => prev === l ? '' : l);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(''); setGenre(''); setLanguage(''); setLetter(''); setSort('name'); setPage(1);
  };

  const hasFilters = search || genre || language || letter;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Authors</h1>
          <p className="text-primary-100 mb-8">Discover the minds behind the books</p>
          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search authors by name…"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm focus:outline-none shadow-lg" />
          </div>
        </div>
      </div>

      {/* Featured authors */}
      <FeaturedStrip authors={featured} />

      <div className="max-w-7xl mx-auto px-4 pb-16">
        {/* A–Z navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Browse A–Z</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALPHABET.map(l => {
              const hasAuthors = letters.includes(l);
              return (
                <button key={l} onClick={() => setLetterFilter(l)} disabled={!hasAuthors}
                  className={`h-8 w-8 rounded-lg text-sm font-bold transition-all ${
                    letter === l
                      ? 'bg-primary-600 text-white shadow'
                      : hasAuthors
                        ? 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                        : 'bg-gray-50 text-gray-300 cursor-default'
                  }`}>
                  {l}
                </button>
              );
            })}
            {letter && (
              <button onClick={() => setLetter('')}
                className="h-8 px-3 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100 font-medium">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          {facets.genres.length > 0 && (
            <select value={genre} onChange={e => { setGenre(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Genres</option>
              {facets.genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {facets.languages.length > 0 && (
            <select value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Languages</option>
              {facets.languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="input w-40">
            <option value="name">A – Z</option>
            <option value="-name">Z – A</option>
            <option value="popular">Most Popular</option>
            <option value="latest">Newest</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary text-sm px-3 py-2 text-red-500">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-sm text-gray-500">{pagination.total} authors</span>
        </div>

        {/* Grid */}
        {loading ? <LoadingSpinner /> : authors.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No authors found</p>
            <p className="text-sm mt-1">Try different search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {authors.map(a => <AuthorCard key={a._id} author={a} />)}
            </div>
            <Pagination page={pagination.page} pages={pagination.pages} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
}
