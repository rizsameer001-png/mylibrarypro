import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import api from '../utils/api';
import { BookCard } from '../components/ui/index';
import BannerSlot from '../components/ui/BannerSlot';
import { getImageUrl, imgOnError } from '../utils/image';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, BookOpenIcon, DevicePhoneMobileIcon,
  BellIcon, CheckIcon, CreditCardIcon, ArrowRightIcon,
  SparklesIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// ── Plan Card ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, formatPrice, isFeatured }) {
  const { user } = useAuth();
  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-7 transition-all hover:shadow-xl ${
      isFeatured ? 'border-primary-500 bg-primary-700 text-white shadow-xl scale-105' : 'border-gray-200 bg-white'
    }`}>
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1 rounded-full shadow">MOST POPULAR</span>
        </div>
      )}
      <h3 className={`text-xl font-bold mb-1 ${isFeatured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
      {plan.description && <p className={`text-sm mb-4 ${isFeatured ? 'text-primary-200' : 'text-gray-500'}`}>{plan.description}</p>}
      <div className={`text-4xl font-extrabold mb-5 ${isFeatured ? 'text-white' : 'text-primary-600'}`}>
        {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
        {plan.price > 0 && <span className={`text-sm font-normal ml-1 ${isFeatured ? 'text-primary-200' : 'text-gray-400'}`}>/{plan.duration}d</span>}
      </div>
      <ul className="space-y-2.5 flex-1 mb-6">
        {[
          `Borrow up to ${plan.borrowingLimit} books`,
          `${plan.duration}-day membership`,
          plan.ebookAccess ? 'E-Book & PDF access' : 'Physical books only',
          'Email notifications',
          'Online account',
        ].map((item, i) => (
          <li key={i} className="flex items-center space-x-2.5 text-sm">
            <CheckIcon className={`h-4 w-4 flex-shrink-0 ${isFeatured ? 'text-primary-200' : 'text-green-500'}`} />
            <span className={isFeatured ? 'text-primary-100' : 'text-gray-600'}>{item}</span>
          </li>
        ))}
      </ul>
      <Link to={user ? '/profile' : '/register'}
        className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
          isFeatured ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}>
        {user ? 'Upgrade Plan' : 'Get Started'}
      </Link>
    </div>
  );
}

// ── Blog Card ──────────────────────────────────────────────────────────────────
function BlogCard({ post }) {
  return (
    <Link to={`/blog/${post.slug || post._id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md overflow-hidden transition-all flex flex-col">
      <div className="h-44 overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100">
        <img src={getImageUrl(post.coverImage)} alt={post.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={imgOnError} />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center space-x-2 mb-2">
          {post.category && <span className="badge badge-blue text-xs">{post.category}</span>}
          {post.tags?.slice(0,1).map(t => <span key={t} className="badge badge-gray text-xs">{t}</span>)}
        </div>
        <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 text-base mb-2">{post.title}</h3>
        {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
          <span>{post.author?.name || 'Library Team'}</span>
          <span className="text-primary-600 font-medium group-hover:underline">Read more →</span>
        </div>
      </div>
    </Link>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [search,       setSearch]       = useState('');
  const [popularBooks, setPopularBooks] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [cms,          setCms]          = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [blogPosts,    setBlogPosts]    = useState([]);
  const [featuredAuthors, setFeaturedAuthors] = useState([]);

  useEffect(() => {
    api.get('/books/popular').then(({data})=>setPopularBooks(data.books)).catch(()=>{});
    api.get('/categories').then(({data})=>setCategories(data.categories.slice(0,8))).catch(()=>{});
    api.get('/memberships').then(({data})=>setPlans(data.plans)).catch(()=>{});
    api.get('/blogs?limit=3&featured=true').then(({data})=>setBlogPosts(data.posts||[])).catch(()=>{});
    api.get('/authors/featured').then(({data})=>setFeaturedAuthors(data.authors?.slice(0,5)||[])).catch(()=>{});
    api.get('/cms').then(({data})=>{
      setCms(data.cms);
      setTestimonials(data.cms.testimonials?.filter(t=>t.isActive)||[]);
    }).catch(()=>{});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/books?search=${encodeURIComponent(search)}`);
  };

  const handleReserve = async (bookId) => {
    if (!user) { toast.error('Please login to reserve books'); navigate('/login'); return; }
    try { await api.post('/circulation/reserve', { bookId }); toast.success('Book reserved!'); }
    catch (err) { toast.error(err.response?.data?.message || 'Reservation failed'); }
  };

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white overflow-hidden min-h-[520px] flex items-center">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
              <SparklesIcon className="h-3.5 w-3.5 text-yellow-400" />
              <span>10,000+ Books Available Online</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 leading-tight">
              {cms?.heroTitle || 'Your Library,'}
              <span className="block text-yellow-400">Anywhere, Anytime</span>
            </h1>
            <p className="text-lg text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              {cms?.heroSubtitle || 'Discover, reserve, and read thousands of books. Your knowledge journey starts here.'}
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto mb-8">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search by title, author, or ISBN…"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 shadow-lg" />
              </div>
              <button type="submit"
                className="px-7 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl transition-colors shadow-lg whitespace-nowrap">
                Search
              </button>
            </form>

            {/* Quick stats */}
            <div className="flex justify-center gap-8 text-center">
              {[['10K+','Books'],['5K+','Members'],['500+','Authors']].map(([n,l])=>(
                <div key={l}>
                  <p className="text-2xl font-bold text-yellow-400">{n}</p>
                  <p className="text-xs text-primary-200">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero Banner Ad ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <BannerSlot placement="home_hero" className="shadow-xl" dismissable />
      </div>

      {/* ── Categories ───────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
            <Link to="/books" className="text-sm text-primary-600 font-medium flex items-center space-x-1 hover:underline">
              <span>All Books</span><ArrowRightIcon className="h-3.5 w-3.5"/>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => (
              <Link key={cat._id} to={`/books?category=${cat._id}`}
                className="group flex flex-col items-center p-4 bg-white border-2 border-transparent rounded-2xl hover:border-primary-300 hover:shadow-md transition-all text-center">
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon || '📚'}</span>
                <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Books ─────────────────────────────────────────────────────── */}
      {popularBooks.length > 0 && (
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Popular Books</h2>
                <p className="text-sm text-gray-500 mt-0.5">Most borrowed and read this month</p>
              </div>
              <Link to="/books" className="btn-secondary text-sm flex items-center space-x-1">
                <span>View All</span><ArrowRightIcon className="h-3.5 w-3.5"/>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popularBooks.slice(0,6).map(book => (
                <BookCard key={book._id} book={book} onReserve={handleReserve}
                  priceDisplay={book.isDigitalSale ? formatPrice(book.digitalPrice) : null} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Middle Banner ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BannerSlot placement="home_middle" className="h-32 sm:h-40" />
      </div>

      {/* ── Featured Authors strip ────────────────────────────────────────────── */}
      {featuredAuthors.length > 0 && (
        <section className="bg-gradient-to-r from-primary-900 to-primary-800 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-7">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <UserGroupIcon className="h-5 w-5 text-yellow-400"/><span>Featured Authors</span>
              </h2>
              <Link to="/authors" className="text-sm text-primary-200 hover:text-white flex items-center space-x-1">
                <span>All Authors</span><ArrowRightIcon className="h-3.5 w-3.5"/>
              </Link>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {featuredAuthors.map(a=>(
                <Link key={a._id} to={`/authors/${a.slug||a._id}`}
                  className="flex-shrink-0 w-28 text-center group">
                  <div className="h-20 w-20 mx-auto rounded-full overflow-hidden border-2 border-yellow-400/50 bg-primary-700 mb-2">
                    <img src={getImageUrl(a.avatar)} alt={a.name}
                      className="h-full w-full object-cover object-top group-hover:scale-110 transition-transform"
                      onError={imgOnError}/>
                  </div>
                  <p className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors leading-tight">{a.name}</p>
                  {a.nationality && <p className="text-xs text-primary-300 mt-0.5">{a.nationality}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Why Choose Us?</h2>
          <p className="text-gray-500 mt-2">Everything you need for a great reading experience</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(cms?.featuresSection?.length ? cms.featuresSection : [
            {icon:'📚', title:'Vast Collection',      description:'Over 10,000 books across all genres and subjects.'},
            {icon:'📱', title:'Mobile App',            description:'Access your library from anywhere with our app.'},
            {icon:'🔔', title:'Smart Notifications',   description:'Get reminded about due dates and new arrivals.'},
            {icon:'📖', title:'E-Books & Read Aloud',  description:'Read or listen to digital books with TTS narration.'},
          ]).map((f, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Membership Plans ─────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="bg-gradient-to-b from-gray-50 to-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <CreditCardIcon className="h-4 w-4"/><span>Membership Plans</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Plan</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Get unlimited access — choose what fits your reading style.</p>
            </div>
            <div className={`grid gap-6 items-center ${
              plans.length===1 ? 'grid-cols-1 max-w-sm mx-auto' :
              plans.length===2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 sm:grid-cols-3'
            }`}>
              {plans.map((plan,i)=>(
                <PlanCard key={plan._id} plan={plan} formatPrice={formatPrice}
                  isFeatured={plans.length>1 && i===Math.floor(plans.length/2)} />
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">All plans include access to our reading app.</p>
          </div>
        </section>
      )}

      {/* ── Blog Posts ───────────────────────────────────────────────────────── */}
      {blogPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">From Our Blog</h2>
              <p className="text-sm text-gray-500 mt-0.5">Reading tips, author spotlights, and library news</p>
            </div>
            <Link to="/blog" className="btn-secondary text-sm flex items-center space-x-1">
              <span>All Posts</span><ArrowRightIcon className="h-3.5 w-3.5"/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map(post=><BlogCard key={post._id} post={post}/>)}
          </div>
        </section>
      )}

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="bg-primary-50 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">What Our Members Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t,i)=>(
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100">
                  <div className="flex text-yellow-400 mb-3">
                    {Array.from({length:t.rating||5}).map((_,j)=>(
                      <StarIcon key={j} className="h-4 w-4"/>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 italic mb-4">"{t.comment}"</p>
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {t.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Banner ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BannerSlot placement="home_bottom" className="h-28 sm:h-36" />
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-900 text-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{cms?.ctaTitle||'Become a Member Today'}</h2>
          <p className="text-primary-100 mb-8">{cms?.ctaDescription||'Join thousands of readers and get unlimited access to our library.'}</p>
          {!user && (
            <div className="flex justify-center gap-4 flex-wrap">
              <Link to="/register" className="px-8 py-3.5 bg-white text-primary-700 rounded-2xl font-bold hover:bg-primary-50 transition-colors shadow-lg">
                Get Started Free
              </Link>
              <Link to="/books" className="px-8 py-3.5 border-2 border-white/30 text-white rounded-2xl font-semibold hover:bg-white/10 transition-colors">
                Browse Books
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
