import { useCallback, useEffect, useState } from 'react';
import { Building2, MapPin, CheckCircle2, PlusCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';

export default function AdminGujiTiPage() {
  const { showToast } = useToast();
  const [itis, setItis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: '', status: 'active' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/guj-iti');
      setItis(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddIti(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      showToast('Please enter both ITI name and city.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/guj-iti', {
        name: form.name.trim(),
        code: form.code.trim(),
        city: form.city.trim(),
        status: form.status,
      });
      showToast('ITI added to GUJ‑ITI directory.', 'success');
      setForm({ name: '', code: '', city: '', status: 'active' });
      setShowForm(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to add ITI', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading GUJ‑ITI directory…" />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  const activeCount = itis.filter((i) => i.status === 'active').length;
  const cities = [...new Set(itis.map((i) => i.city))];

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Institute Directory"
        title="GUJ‑ITI Overview"
        description="All Industrial Training Institutes registered in the system across Gujarat."
        badge={`${itis.length} Institutes`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            <PlusCircle size={15} />
            {showForm ? 'Close Form' : 'Add ITI'}
          </Button>
        }
      />

      <div className="stat-grid stat-grid-3" style={{ marginBottom: 22 }}>
        <StatCard label="Total ITIs" value={itis.length} icon={Building2} tone="blue" hint="Registered institutes" />
        <StatCard label="Active ITIs" value={activeCount} icon={CheckCircle2} tone="green" hint="Currently operational" />
        <StatCard label="Cities Covered" value={cities.length} icon={MapPin} tone="violet" hint={cities.slice(0, 3).join(', ') || '—'} />
      </div>

      {showForm ? (
        <form className="card" onSubmit={handleAddIti} style={{ marginBottom: 24 }}>
          <div className="section-heading">
            <div>
              <h2>Add New Gujarat ITI</h2>
              <p>Register an Industrial Training Institute with its city and status.</p>
            </div>
          </div>
          <div className="quiz-meta-grid">
            <div className="quiz-field">
              <label htmlFor="iti-name">ITI Name *</label>
              <input
                id="iti-name"
                type="text"
                placeholder="e.g. Government ITI Vadodara"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="quiz-field">
              <label htmlFor="iti-code">Institute Code</label>
              <input
                id="iti-code"
                type="text"
                placeholder="e.g. GUJ-BRC-01"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="quiz-field">
              <label htmlFor="iti-city">City *</label>
              <input
                id="iti-city"
                type="text"
                placeholder="e.g. Vadodara"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                required
              />
            </div>
            <div className="quiz-field">
              <label htmlFor="iti-status">Status</label>
              <select
                id="iti-status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? 'Saving…' : 'Save ITI'}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <div className="section-heading">
          <div>
            <h2>Registered Institutes</h2>
            <p>Industrial Training Institutes across Gujarat with their current status.</p>
          </div>
        </div>

        {itis.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No ITIs registered"
            description="No institutes have been added to the system yet."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Institute Name</th>
                  <th>Code</th>
                  <th>City</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {itis.map((iti, idx) => (
                  <tr key={iti.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{iti.name}</strong></td>
                    <td>{iti.code || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={14} /> {iti.city}
                      </span>
                    </td>
                    <td>
                      <Badge tone={iti.status === 'active' ? 'success' : 'danger'}>
                        {iti.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
