import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpenIcon, HomeIcon, UsersIcon, ArrowsRightLeftIcon, TagIcon,
  ChartBarIcon, DocumentTextIcon, Cog6ToothIcon, ExclamationTriangleIcon,
  CreditCardIcon, GlobeAltIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/admin',              label: 'Dashboard',    icon: HomeIcon,                end: true },
  { to: '/admin/books',        label: 'Books',         icon: BookOpenIcon },
  { to: '/admin/authors',      label: 'Authors',       icon: UserGroupIcon },
  { to: '/admin/users',        label: 'Users',         icon: UsersIcon },
  { to: '/admin/circulation',  label: 'Circulation',   icon: ArrowsRightLeftIcon },
  { to: '/admin/categories',   label: 'Categories',    icon: TagIcon },
  { to: '/admin/penalties',    label: 'Penalties',     icon: ExclamationTriangleIcon },
  { to: '/admin/memberships',  label: 'Memberships',   icon: CreditCardIcon },
  { to: '/admin/reports',      label: 'Reports',       icon: ChartBarIcon },
  { to: '/admin/cms',          label: 'CMS',           icon: GlobeAltIcon },
  { to: '/admin/settings',     label: 'Settings',      icon: Cog6ToothIcon },
];

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
          <Link to="/" className="flex items-center space-x-2">
            <BookOpenIcon className="h-7 w-7 text-primary-400" />
            <span className="font-bold text-lg">LMS Admin</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="ml-3 font-semibold text-gray-800">Admin Panel</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
