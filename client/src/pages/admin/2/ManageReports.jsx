import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LoadingSpinner, EmptyState } from '../../components/ui/index';
import toast from 'react-hot-toast';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function ManageReports() {
  const [overdues, setOverdues] = useState([]);
  const [circulations, setCirculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overdue');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'overdue') {
        const { data } = await api.get('/reports/overdue');
        setOverdues(data.overdues);
      } else {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const { data } = await api.get(`/reports/circulation?${params}`);
        setCirculations(data.circulations);
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ export: 'true' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await api.get(`/reports/circulation?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a'); a.href = url; a.download = 'circulation-report.xlsx'; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        {tab === 'circulation' && (
          <button onClick={handleExport} className="btn-secondary text-sm">⬇ Export Excel</button>
        )}
      </div>

      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[['overdue', 'Overdue Books'], ['circulation', 'Circulation Log']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === k ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'circulation' && (
        <div className="flex gap-3 mb-4">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="btn-primary text-sm">Apply</button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          {tab === 'overdue' ? (
            overdues.length === 0 ? <EmptyState icon={ChartBarIcon} title="No overdue books" /> : (
              <table className="table-base">
                <thead><tr>
                  {['Book', 'ISBN', 'Member', 'Email', 'Due Date', 'Days Late'].map(h => <th key={h} className="th">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {overdues.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="td font-medium">{c.book?.title}</td>
                      <td className="td text-xs text-gray-500">{c.book?.isbn}</td>
                      <td className="td">{c.member?.name}</td>
                      <td className="td text-xs text-gray-500">{c.member?.email}</td>
                      <td className="td text-xs text-red-600">{c.dueDate ? format(new Date(c.dueDate), 'MMM d, yyyy') : '—'}</td>
                      <td className="td">
                        <span className="badge badge-red">
                          {Math.max(0, Math.floor((Date.now() - new Date(c.dueDate)) / 86400000))} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            circulations.length === 0 ? <EmptyState icon={ChartBarIcon} title="No records" /> : (
              <table className="table-base">
                <thead><tr>
                  {['Book', 'Member', 'Type', 'Status', 'Issue Date', 'Return Date', 'Fine'].map(h => <th key={h} className="th">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {circulations.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="td font-medium text-sm">{c.book?.title}</td>
                      <td className="td text-sm">{c.member?.name}</td>
                      <td className="td"><span className="badge badge-gray capitalize">{c.type}</span></td>
                      <td className="td"><span className={`badge badge-${c.status === 'returned' ? 'green' : c.status === 'overdue' ? 'red' : 'blue'}`}>{c.status}</span></td>
                      <td className="td text-xs text-gray-500">{c.issueDate ? format(new Date(c.issueDate), 'MMM d, yyyy') : '—'}</td>
                      <td className="td text-xs text-gray-500">{c.returnDate ? format(new Date(c.returnDate), 'MMM d, yyyy') : '—'}</td>
                      <td className="td text-xs">{c.fine > 0 ? <span className="text-red-600">${c.fine.toFixed(2)}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
}
