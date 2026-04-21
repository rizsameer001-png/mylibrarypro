import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Public
import Home           from './pages/Home';
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Books          from './pages/Books';
import BookDetail     from './pages/BookDetail';
import Profile        from './pages/Profile';
import Authors        from './pages/authors/Authors';
import AuthorProfile  from './pages/authors/AuthorProfile';

// Member
import MyBooks     from './pages/member/MyBooks';
import MyDownloads from './pages/member/MyDownloads';

// Admin
import Dashboard         from './pages/admin/Dashboard';
import ManageBooks       from './pages/admin/ManageBooks';
import ManageUsers       from './pages/admin/ManageUsers';
import ManageCirculation from './pages/admin/ManageCirculation';
import ManageCategories  from './pages/admin/ManageCategories';
import ManageAuthors     from './pages/admin/ManageAuthors';
import ManageReports     from './pages/admin/ManageReports';
import ManageCMS         from './pages/admin/ManageCMS';
import ManageSettings    from './pages/admin/ManageSettings';
import ManagePenalties   from './pages/admin/ManagePenalties';
import ManageMemberships from './pages/admin/ManageMemberships';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout  from './components/layout/AdminLayout';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/"                      element={<Home />} />
        <Route path="/books"                 element={<Books />} />
        <Route path="/books/:id"             element={<BookDetail />} />
        <Route path="/authors"               element={<Authors />} />
        <Route path="/authors/:slug"         element={<AuthorProfile />} />
        <Route path="/login"                 element={<Login />} />
        <Route path="/register"              element={<Register />} />
        <Route path="/forgot-password"       element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/profile"               element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/my-books"              element={<PrivateRoute roles={['member']}><MyBooks /></PrivateRoute>} />
        <Route path="/my-downloads"          element={<PrivateRoute roles={['member']}><MyDownloads /></PrivateRoute>} />
      </Route>

      <Route path="/admin" element={<PrivateRoute roles={['admin','manager']}><AdminLayout /></PrivateRoute>}>
        <Route index                    element={<Dashboard />} />
        <Route path="books"             element={<ManageBooks />} />
        <Route path="users"             element={<ManageUsers />} />
        <Route path="circulation"       element={<ManageCirculation />} />
        <Route path="categories"        element={<ManageCategories />} />
        <Route path="authors"           element={<ManageAuthors />} />
        <Route path="reports"           element={<ManageReports />} />
        <Route path="cms"               element={<ManageCMS />} />
        <Route path="settings"          element={<ManageSettings />} />
        <Route path="penalties"         element={<ManagePenalties />} />
        <Route path="memberships"       element={<ManageMemberships />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
