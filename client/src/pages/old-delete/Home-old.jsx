import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import api from '../utils/api';
import { BookCard } from '../components/ui/index';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, BookOpenIcon, DevicePhoneMobileIcon,
  BellIcon, CheckIcon, CreditCardIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// Standardized features list
const features = [
  { icon: BookOpenIcon, title: 'Vast Collection', desc: 'Over 10,000 books across all genres and subjects.' },
  { icon: DevicePhoneMobileIcon, title: 'Mobile App', desc: 'Access your library from anywhere with our Flutter app.' },
  { icon: BellIcon, title: 'Smart Notifications', desc: 'Get reminded about due dates and new arrivals.' },
  { icon: BookOpenIcon, title: 'E-Books & PDFs', desc: 'Read or download digital books online anytime.' },
];

// ── Membership Plan Card ────────────────────────────────────────────────────────
function PlanCard({ plan, formatPrice, isFeatured }) {
  const { user } = useAuth();
  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-8 transition-all hover:shadow-xl ${
      isFeatured
        ? 'border-primary-500 bg-primary-700 text-white shadow-xl scale-105'
        : 'border-gray-200 bg-white text-gray-900'
    }`}>
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">MOST POPULAR</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-1 ${isFeatured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
        {plan.description && (
          <p className={`text-sm ${isFeatured ? 'text-primary-200' : 'text-gray-500'}`}>{plan.description}</p>
        )}
      </div>

      <div className="mb-6">
        <span className={`text-4xl font-extrabold ${isFeatured ? 'text-white' : 'text-primary-600'}`}>
          {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
        </span>
        {plan.price > 0 && (
          <span className={`text-sm ml-1 ${isFeatured ? 'text-primary-200' : 'text-gray-400'}`}>/ {plan.duration} days</span>
        )}
      </div>

      <ul className="space-y-3 flex-1 mb-8">
        {[
          `Borrow up to ${plan.borrowingLimit} books`,
          `${plan.duration}-day membership`,
          plan.ebookAccess ? 'E-Book & PDF access' : 'Physical books only',
          'Email notifications',
          'Online account management',
        ].map((item, i) => (
          <li key={i} className="flex items-start space-x-2.5">
            <CheckIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isFeatured ? 'text-primary-200' : 'text-green-500'}`}/>
            <span className={`text-sm ${isFeatured ? 'text-primary-100' : 'text-gray-600'}`}>{item}</span>
          </li>
        ))}
      </ul>

      <Link to={user ? '/profile' : '/register'}
        className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
          isFeatured
            ? 'bg-white text-primary-700 hover:bg-primary-50'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}>
        {user ? 'Upgrade Plan' : 'Get Started'}
      </Link>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [popularBooks, setPopularBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cms, setCms] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get('/books/popular').then(({ data }) => setPopularBooks(data.books)).catch(() => {});
    api.get('/categories').then(({ data }) => setCategories(data.categories.slice(0, 8))).catch(() => {});
    api.get('/memberships').then(({ data }) => setPlans(data.plans)).catch(() => {});
    api.get('/cms').then(({ data }) => {
      setCms(data.cms);
      setTestimonials(data.cms.testimonials?.filter(t => t.isActive) || []);
    }).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/books?search=${encodeURIComponent(search)}`);
  };

  const handleReserve = async (bookId) => {
    if (!user) { toast.error('Please login to reserve books'); navigate('/login'); return; }
    try {
      await api.post('/circulation/reserve', { bookId });
      toast.success('Book reserved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    }
  };

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {cms?.heroTitle || 'Welcome to City Library'}
          </h1>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            {cms?.heroSubtitle || 'Discover thousands of books, journals, and e-books.'}
          </p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, author, or ISBN..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-gray-900 text-sm focus:outline-none" />
            </div>
            <button type="submit"
              className="px-6 py-3.5 bg-accent-500 hover:bg-accent-600 rounded-xl font-semibold text-white transition-colors">
              Search
            </button>
          </form>
          {!user && (
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/books" className="px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50">Browse Books</Link>
              <Link to="/register" className="px-6 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10">Join Now</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => (
              <Link key={cat._id} to={`/books?category=${cat._id}`}
                className="flex flex-col items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-primary-300 hover:shadow-md transition-all text-center">
                {/* Fixed: Ensuring the icon renders as text/string, not a tag */}
                <span className="text-2xl mb-2">{String(cat.icon || '📚')}</span>
                <span className="text-xs font-medium text-gray-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Books ─────────────────────────────────────────────────────── */}
      {popularBooks.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Popular Books</h2>
              <Link to="/books" className="text-sm text-primary-600 font-medium hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {popularBooks.slice(0, 8).map(book => (
                <BookCard key={book._id} book={book} onReserve={handleReserve}
                  priceDisplay={book.isDigitalSale ? (book.digitalPriceDisplay || formatPrice(book.digitalPrice)) : null}/>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Why Choose Us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(cms?.featuresSection?.length ? cms.featuresSection : features).map((f, i) => {
             // Correctly handle dynamic Icons vs Lucide/HeroIcons
             const Icon = f.icon;
             return (
              <div key={i} className="text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">
                  {typeof Icon === 'function' || typeof Icon === 'object' ? (
                     <Icon className="h-8 w-8 mx-auto text-primary-600" />
                  ) : (
                    <span className="h-8 w-8 mx-auto block">{Icon || '✨'}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description || f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Membership Plans ──────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="bg-gradient-to-b from-gray-50 to-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <CreditCardIcon className="h-4 w-4"/>
                <span>Membership Plans</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Plan</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Get unlimited access to our library. Choose the plan that fits your reading lifestyle.
              </p>
            </div>

            <div className={`grid gap-6 items-center ${
              plans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
              plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  formatPrice={formatPrice}
                  isFeatured={plans.length > 1 && i === Math.floor(plans.length / 2)}
                />
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              All plans include access to our reading app. Cancel anytime.
            </p>
          </div>
        </section>
      )}

      {/* ── Testimonials ──────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="bg-primary-50 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">What Our Members Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-primary-100">
                  <div className="flex text-yellow-400 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <StarIcon key={j} className="h-4 w-4 text-yellow-400"/>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 italic mb-4">"{t.comment}"</p>
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold text-sm">
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

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="bg-primary-700 text-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{cms?.ctaTitle || 'Become a Member Today'}</h2>
          <p className="text-primary-100 mb-8">
            {cms?.ctaDescription || 'Join thousands of readers and get unlimited access to our library.'}
          </p>
          {!user && (
            <Link to="/register"
              className="inline-block px-8 py-3.5 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
              Get Started — It's Free
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}