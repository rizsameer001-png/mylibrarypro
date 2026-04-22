import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpenIcon, Bars3Icon, XMarkIcon, UserCircleIcon,
  ArrowRightOnRectangleIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout, isManager } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/books', label: 'Browse Books' },
    { to: '/authors', label: 'Authors' },
    { to: '/blog',    label: 'Blog' },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpenIcon className="h-8 w-8 text-primary-600" />
            <span className="font-bold text-xl text-gray-900">City Library</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} end className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`
              }>{l.label}</NavLink>
            ))}

            {user ? (
              <div className="relative">
                <button onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-primary-600">
                  <UserCircleIcon className="h-6 w-6" />
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50"
                    onBlur={() => setDropOpen(false)}>
                    {isManager && (
                      <Link to="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Cog6ToothIcon className="h-4 w-4 mr-2" /> Admin Panel
                      </Link>
                    )}
                    {user.role === 'member' && (
                      <>
                        <Link to="/my-books" onClick={() => setDropOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <BookOpenIcon className="h-4 w-4 mr-2" /> My Books
                        </Link>
                        <Link to="/my-downloads" onClick={() => setDropOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <BookOpenIcon className="h-4 w-4 mr-2" /> My Downloads
                        </Link>
                      </>
                    )}
                    <Link to="/profile" onClick={() => setDropOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <UserCircleIcon className="h-4 w-4 mr-2" /> Profile
                    </Link>
                    <button onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="btn-secondary text-sm px-4 py-2">Login</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">Join Now</Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} end onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block py-2 text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-700'}`
              }>{l.label}</NavLink>
          ))}
          {user ? (
            <>
              {isManager && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">Admin Panel</Link>}
              {user.role === 'member' && (
                <>
                  <Link to="/my-books" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">My Books</Link>
                  <Link to="/my-downloads" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">My Downloads</Link>
                </>
              )}
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">Profile</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm text-red-600">Logout</button>
            </>
          ) : (
            <div className="flex space-x-3 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary flex-1 text-center text-sm">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 text-center text-sm">Join Now</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 mt-16">
    <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center space-x-2 mb-3">
          <BookOpenIcon className="h-7 w-7 text-primary-400" />
          <span className="font-bold text-white text-lg">City Library</span>
        </div>
        <p className="text-sm leading-relaxed">Your knowledge hub. Discover, reserve, and read thousands of books and e-books from anywhere.</p>
      </div>
      <div>
        <h4 className="font-semibold text-white mb-3">Quick Links</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
          <li><Link to="/books" className="hover:text-white transition-colors">Browse Books</Link></li>
          <li><Link to="/register" className="hover:text-white transition-colors">Become a Member</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-white mb-3">Contact</h4>
        <ul className="space-y-2 text-sm">
          <li>📧 library@example.com</li>
          <li>📞 +1 (555) 000-0000</li>
          <li>🕐 Mon–Sat, 9am–8pm</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-gray-800 py-4 text-center text-xs">
      © {new Date().getFullYear()} City Library. All rights reserved.
    </div>
  </footer>
);

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
