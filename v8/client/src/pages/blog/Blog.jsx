import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl, imgOnError } from '../../utils/image';
import { LoadingSpinner, Pagination } from '../../components/ui/index';
import BannerSlot from '../../components/ui/BannerSlot';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Blog() {
  const [posts, setPosts]           = useState([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit:9 });
    if (category) p.set('category', category);
    api.get(`/blogs?${p}`)
      .then(({ data }) => { setPosts(data.posts||[]); setPagination(data.pagination||{}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, category]);

  const filtered = search ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase())) : posts;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Library Blog</h1>
        <p className="text-gray-500">Reading tips, author spotlights, and library news</p>
      </div>

      <BannerSlot placement="books_top" className="mb-8 h-28" />

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search posts…" className="input pl-9"/>
        </div>
        {['General','Reviews','Authors','News','Tips'].map(c=>(
          <button key={c} onClick={()=>setCategory(category===c?'':c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${category===c?'bg-primary-600 text-white border-primary-600':'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner/> : filtered.length===0 ? (
        <div className="text-center py-20 text-gray-400">No posts found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(post=>(
              <Link key={post._id} to={`/blog/${post.slug||post._id}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md overflow-hidden transition-all flex flex-col">
                <div className="h-48 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
                  <img src={getImageUrl(post.coverImage)} alt={post.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={imgOnError}/>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {post.category && <span className="badge badge-blue text-xs">{post.category}</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 text-base mb-2">{post.title}</h3>
                  {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                    <span>{post.author?.name||'Library Team'}</span>
                    {post.publishedAt && <span>{format(new Date(post.publishedAt),'MMM d, yyyy')}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={setPage}/>
        </>
      )}
    </div>
  );
}
