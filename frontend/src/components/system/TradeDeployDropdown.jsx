import { useState } from 'react';
import { FolderSync } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import Button from '../common/Button';

export const EXPANSION_TRADES = [
  {
    code: 'FIT-01',
    name: 'Fitter Trade',
    duration: '2-Year CTS Course',
    tone: 'blue',
    summary:
      'Precision bench fitting, vernier marking, hacksawing to ±0.05mm, lathe operations, drilling, and mechanical assembly.',
    includes: 'Module 1 (Bench Fitting) with 4 rubric criteria & mandatory PPE gate.',
  },
  {
    code: 'WEL-01',
    name: 'Welder (Gas & Electric)',
    duration: '1-Year CTS Course',
    tone: 'amber',
    summary:
      'Shielded Metal Arc Welding (SMAW), Oxy-Acetylene gas cutting, single V-butt joints (1F/2F), and non-destructive weld inspection.',
    includes: 'Module 1 (SMAW Flat Position) with ventilation safety gates.',
  },
  {
    code: 'COPA-01',
    name: 'COPA (Computer Operator)',
    duration: '1-Year CTS Course',
    tone: 'green',
    summary:
      'Relational database design, 3NF schema normalization, SQL DDL/DML execution, office automation, and web scripting.',
    includes: 'Module 1 (Relational SQL & Schema Design) with electrical safety.',
  },
];

export default function TradeDeployDropdown({ provisionedCodes = [], onDeploy }) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const provisionedSet = new Set(provisionedCodes);

  async function handleDeploy() {
    if (!selected) return;
    setLoading(true);
    try {
      const result = await api.post('/system/rollout/trade', { trade_code: selected });
      const label = result?.trade_name || selected;
      showToast(result?.message || `Trade ${label} (${selected}) provisioned!`, 'success');
      setSelected('');
      if (onDeploy) {
        await onDeploy();
      }
    } catch (e) {
      showToast(e.message || 'Trade deployment failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="trade-deploy-bar">
      <select
        aria-label="Select CTS trade to deploy"
        className="trade-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
      >
        <option value="">Quick-select trade to provision…</option>
        {EXPANSION_TRADES.map((trade) => {
          const isProvisioned = provisionedSet.has(trade.code);
          return (
            <option key={trade.code} value={trade.code}>
              {trade.code} — {trade.name} {isProvisioned ? '(Provisioned)' : ''}
            </option>
          );
        })}
      </select>
      <Button
        variant="primary"
        size="sm"
        onClick={handleDeploy}
        disabled={!selected || loading}
        loading={loading}
      >
        {!loading ? <FolderSync size={15} /> : null}
        {loading ? 'Deploying…' : 'Deploy Trade'}
      </Button>
    </div>
  );
}
