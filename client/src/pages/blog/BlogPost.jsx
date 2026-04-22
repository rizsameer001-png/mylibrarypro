import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl, imgOnError } from '../../utils/image';
import { LoadingSpinner } from '../../components/ui/index';
import BannerSlot from '../../components/ui/BannerSlot';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/blogs/${slug}`)
      .then(({ data }) => setPost(data.post))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner/>;
  if (!post)   return <div className="text-center py-20 text-gray-400">Post not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/blog" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1"/>Back to Blog
      </Link>

      {post.coverImage && (
        <div className="h-64 sm:h-80 rounded-2xl overflow-hidden mb-8 shadow-md">
          <img src={getImageUrl(post.coverImage)} alt={post.title}
            className="h-full w-full object-cover" onError={imgOnError}/>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {post.category && <span className="badge badge-blue">{post.category}</span>}
        {post.tags?.map(t=><span key={t} className="badge badge-gray">{t}</span>)}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
      <div className="flex items-center space-x-3 mb-8 text-sm text-gray-500">
        <span>By {post.author?.name||'Library Team'}</span>
        {post.publishedAt && <span>· {format(new Date(post.publishedAt),'MMMM d, yyyy')}</span>}
        <span>· {post.views||0} views</span>
      </div>

      <BannerSlot placement="book_detail" className="mb-8 h-24" dismissable/>

      <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
        {post.content || post.excerpt}
      </div>
    </div>
  );
}
