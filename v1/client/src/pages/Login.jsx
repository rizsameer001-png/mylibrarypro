import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <BookOpenIcon className="h-12 w-12 text-primary-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="card">{children}</div>
    </div>
  </div>
);

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role !== 'member' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Sign in to your account" subtitle="Welcome back!">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="you@example.com" required
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="••••••••" required
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">
        Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
      </p>
    </AuthCard>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Create your account" subtitle="Join our library community">
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
          { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+1 555 000 0000' },
          { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        ].map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input type={type} className="input" placeholder={placeholder}
              required={key !== 'phone'} value={form[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send a reset link">
      {sent ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📧</div>
          <p className="text-gray-600 text-sm">Check your inbox for the reset link.</p>
          <Link to="/login" className="mt-4 inline-block text-primary-600 text-sm hover:underline">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="you@example.com" required
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-primary-600">Back to login</Link>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPassword() {
  const { token } = { token: window.location.pathname.split('/').pop() };
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.put(`/auth/reset-password/${token}`, { password: form.password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Reset your password" subtitle="Enter your new password below">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" placeholder="••••••••" required minLength={6}
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input" placeholder="••••••••" required
            value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </AuthCard>
  );
}

export default Login;
