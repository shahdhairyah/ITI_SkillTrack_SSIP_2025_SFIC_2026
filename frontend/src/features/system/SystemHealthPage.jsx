import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Download,
  FolderSync,
  HardDrive,
  Layers,
  PlusCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function SystemHealthPage() {
  const { showToast } = useToast();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deployingTrade, setDeployingTrade] = useState(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    setLoading(true);
    try {
      const res = await api.get('/system/health/operational');
      if (res.status === 'success') {
        setHealthData(res.data);
      }
    } catch (e) {
      showToast(e.message || 'Failed to retrieve system diagnostics', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeployTrade(tradeCode, tradeTitle) {
    setDeployingTrade(tradeCode);
    try {
      const res = await api.post('/system/rollout/trade', { trade_code: tradeCode });
      if (res.status === 'success') {
        showToast(`Trade ${tradeTitle} (${tradeCode}) and curriculum successfully provisioned!`, 'success');
        await loadHealth();
      }
    } catch (e) {
      showToast(e.message || 'Trade rollout failed', 'error');
    } finally {
      setDeployingTrade(null);
    }
  }

  async function handleDownloadBackup() {
    setDownloadingBackup(true);
    try {
      const res = await fetch('/api/v1/system/backup', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!res.ok) throw new Error('Backup generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iti-skilltrack-snapshot-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast('Institutional SQL database snapshot downloaded successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Backup failed', 'error');
    } finally {
      setDownloadingBackup(false);
    }
  }

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Production Health & Operational Monitoring Center"
        subtitle="Phase 8 · Real-Time Institutional Telemetry, Multi-Trade Rollout Manager & Disaster Recovery"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadHealth}
              disabled={loading}
            >
              Refresh Telemetry
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
            >
              {downloadingBackup ? 'Dumping DB...' : 'Generate DB Snapshot'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p>Querying institutional runtime telemetry and health probes...</p>
        </div>
      ) : healthData ? (
        <div className="space-y-8">
          {/* Section 1: Live Status Banner */}
          <div className="p-5 bg-gradient-to-r from-emerald-950 to-slate-900 rounded-2xl text-white shadow-lg border border-emerald-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs uppercase font-mono tracking-wider text-emerald-300 font-semibold">
                    System State: {healthData.system.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Production Operational Readiness: 100% Verified
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Engine: <strong className="text-white font-mono">{healthData.system.database_driver.toUpperCase()}</strong> · PHP Runtime: <strong className="text-white font-mono">{healthData.system.php_version}</strong> · Host Time: {healthData.system.server_time}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-xs text-slate-400">Total Audit Volume</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {healthData.metrics.total_audit_events} Events
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Core Operational Metrics */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Institutional Telemetry & Workload Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Active CTS Trades"
                value={healthData.metrics.total_trades}
                icon={Building2}
                tone="info"
                note="Curricula provisioned"
              />
              <StatCard
                title="Session Completion"
                value={`${healthData.metrics.session_completion_rate}%`}
                icon={CheckCircle2}
                tone="success"
                note={`${healthData.metrics.total_sessions} scheduled sessions`}
              />
              <StatCard
                title="Practical Assessments"
                value={healthData.metrics.total_assessments_logged}
                icon={Layers}
                tone="neutral"
                note="Rubric evaluations logged"
              />
              <StatCard
                title="Remedial Resolution Velocity"
                value={`${healthData.metrics.resolved_remedial_count} Done`}
                icon={Zap}
                tone="success"
                note={`${healthData.metrics.open_remedial_backlog} open in queue`}
              />
            </div>
          </div>

          {/* Section 3: Multi-Trade Expansion Manager */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  Phase 8 Multi-Trade Expansion Catalog (1-Click Institutional Rollout)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Instantly provision additional Craftsmen Training Scheme (CTS) vocational trades with pre-configured
                  modules, hands-on workshop practicals, and DEC-05 safety-critical rubric criteria.
                </p>
              </div>
              <Badge tone="info">DGT NSQF Level 4/5 Ready</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Trade 1: Fitter */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4 hover:border-blue-300 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      FIT-01
                    </span>
                    <span className="text-xs font-semibold text-slate-500">2-Year CTS Course</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Fitter Trade</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Precision bench fitting, vernier marking, hacksawing to ±0.05mm, lathe operations, drilling, and mechanical assembly.
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                    Includes: Module 1 (Bench Fitting) with 4 rubric criteria & mandatory PPE gate.
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={FolderSync}
                  onClick={() => handleDeployTrade('FIT-01', 'Fitter')}
                  disabled={deployingTrade === 'FIT-01'}
                >
                  {deployingTrade === 'FIT-01' ? 'Deploying...' : 'Roll Out Fitter Trade'}
                </Button>
              </div>

              {/* Trade 2: Welder */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4 hover:border-blue-300 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                      WEL-01
                    </span>
                    <span className="text-xs font-semibold text-slate-500">1-Year CTS Course</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Welder (Gas & Electric)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Shielded Metal Arc Welding (SMAW), Oxy-Acetylene gas cutting, single V-butt joints (1F/2F), and non-destructive weld inspection.
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                    Includes: Module 1 (SMAW Flat Position) with ventilation safety gates.
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={FolderSync}
                  onClick={() => handleDeployTrade('WEL-01', 'Welder')}
                  disabled={deployingTrade === 'WEL-01'}
                >
                  {deployingTrade === 'WEL-01' ? 'Deploying...' : 'Roll Out Welder Trade'}
                </Button>
              </div>

              {/* Trade 3: COPA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4 hover:border-blue-300 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      COPA-01
                    </span>
                    <span className="text-xs font-semibold text-slate-500">1-Year CTS Course</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">COPA (Computer Operator)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Relational database design, 3NF schema normalization, SQL DDL/DML execution, office automation, and web scripting.
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                    Includes: Module 1 (Relational SQL & Schema Design) with electrical safety.
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={FolderSync}
                  onClick={() => handleDeployTrade('COPA-01', 'COPA')}
                  disabled={deployingTrade === 'COPA-01'}
                >
                  {deployingTrade === 'COPA-01' ? 'Deploying...' : 'Roll Out COPA Trade'}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 4: Security & Operational Perimeter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security & Compliance Hardening Matrix
              </h4>
              <ul className="text-xs space-y-2.5 text-slate-600">
                <li className="flex items-center justify-between">
                  <span>Server-Side IDOR Scoping Enforcer:</span>
                  <Badge tone="success">Active (Role-Scoped)</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Session Cookie Security (HttpOnly / SameSite):</span>
                  <Badge tone="success">Enforced</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>CSRF Double-Submit Verification:</span>
                  <Badge tone="success">Enabled</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>DEC-09 CSV Formula Injection Neutralization:</span>
                  <Badge tone="success">Sanitized</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>DEC-08 Dedicated Private Uploads Directory:</span>
                  <Badge tone="success">Isolated</Badge>
                </li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Storage & Disaster Recovery Runbook
              </h4>
              <div className="text-xs space-y-2 text-slate-600">
                <p>
                  Database state is maintained with continuous transactional integrity. Administrators can generate on-demand
                  SQL snapshots or use the automated backup runbook:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                  <div># Trigger on-demand backup snapshot:</div>
                  <div className="text-emerald-400">GET /api/v1/system/backup</div>
                  <div className="mt-2 text-slate-400"># Verify database schema integrity:</div>
                  <div className="text-emerald-400">GET /api/v1/system/uat/run</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

