import { useEffect, useState } from 'react';
import {
  Clock,
  Eye,
  FileCode,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function AuditLogPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(30);
  const [offset, setOffset] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Selected Log for Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [offset, actionFilter, entityFilter]);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.status === 'success') {
        setLogs(res.data || []);
        setTotal(res.meta?.total || 0);
      }
    } catch (e) {
      showToast(e.message || 'Failed to retrieve audit log journal', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getActionTone(action) {
    if (action.includes('SUBMIT') || action.includes('APPROVED')) return 'success';
    if (action.includes('CORRECT') || action.includes('UPDATE')) return 'info';
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('RESET')) return 'critical';
    if (action.includes('FAILED') || action.includes('GAP')) return 'warning';
    return 'neutral';
  }

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Institutional Audit Trail & Forensic Journal"
        subtitle="Phase 6 · Tamper-Resistant Immutable Log of State Mutations, Rubric Scores, Attendance Submissions & Corrections"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadAuditLogs}
            disabled={loading}
          >
            Refresh Logs
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Entity Types</option>
            <option value="attendance_record">Attendance Records</option>
            <option value="training_session">Training Sessions</option>
            <option value="assessment">Practical Assessments</option>
            <option value="remedial_assignment">Remedial Tasks</option>
            <option value="user">User Accounts</option>
            <option value="batch">Batches</option>
            <option value="trade">Trades</option>
            <option value="evidence_upload">Evidence Files</option>
          </select>

          <input
            type="text"
            placeholder="Search action keyword..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong> journal entries
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p>Fetching immutable audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No audit events match the specified filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Request Tracking ID</th>
                  <th className="py-3 px-4 text-center">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 font-sans">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">#{log.id}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      <div className="font-medium text-slate-800">{log.created_at}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.actor_name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={getActionTone(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      <span className="font-semibold text-slate-800">{log.entity_type}</span>:{log.entity_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                      {log.request_id}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Forensic State Audit — Entry #${selectedLog.id}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400">Actor:</span>{' '}
                <strong className="text-slate-800">{selectedLog.actor_name}</strong>
              </div>
              <div>
                <span className="text-slate-400">Action:</span>{' '}
                <strong className="text-slate-800">{selectedLog.action}</strong>
              </div>
              <div>
                <span className="text-slate-400">Target:</span>{' '}
                <strong>
                  {selectedLog.entity_type} #{selectedLog.entity_id}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Timestamp:</span>{' '}
                <strong>{selectedLog.created_at}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-rose-600" />
                  Prior State (Before Mutation)
                </h4>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-64 border border-slate-800">
                  {selectedLog.before
                    ? JSON.stringify(selectedLog.before, null, 2)
                    : '// No prior state recorded (Entity creation)'}
                </pre>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                  Committed State (After Mutation)
                </h4>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-64 border border-slate-800">
                  {selectedLog.after
                    ? JSON.stringify(selectedLog.after, null, 2)
                    : '// No state modification payload'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

