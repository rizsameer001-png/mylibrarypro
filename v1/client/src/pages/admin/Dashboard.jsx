import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { StatCard, LoadingSpinner } from '../../components/ui/index';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { BookOpenIcon, UsersIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const chartData = {
    labels: stats?.monthlyData?.map(m => m.month) || [],
    datasets: [
      { label: 'Issued', data: stats?.monthlyData?.map(m => m.issued) || [], backgroundColor: '#3b82f6', borderRadius: 4 },
      { label: 'Returned', data: stats?.monthlyData?.map(m => m.returned) || [], backgroundColor: '#10b981', borderRadius: 4 },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' } } },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Books" value={stats?.stats?.totalBooks ?? 0} icon={BookOpenIcon} color="blue" />
        <StatCard label="Active Members" value={stats?.stats?.totalMembers ?? 0} icon={UsersIcon} color="green" />
        <StatCard label="Books Issued" value={stats?.stats?.activeIssues ?? 0} icon={ArrowsRightLeftIcon} color="purple" />
        <StatCard label="Overdue" value={stats?.stats?.overdueBooks ?? 0} icon={ExclamationTriangleIcon} color="red" />
        <StatCard label="Reservations" value={stats?.stats?.totalReservations ?? 0} icon={BookmarkIcon} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-800 mb-4">Circulation Trends (Last 6 Months)</h2>
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {(stats?.recentActivity || []).slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-600 flex-shrink-0">
                  {a.user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">{a.action?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 truncate">{a.details}</p>
                  <p className="text-xs text-gray-400">{a.createdAt ? format(new Date(a.createdAt), 'MMM d, h:mm a') : ''}</p>
                </div>
              </div>
            ))}
            {!stats?.recentActivity?.length && <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
