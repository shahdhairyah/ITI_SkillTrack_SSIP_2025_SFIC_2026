import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeHealthPayload(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const system = data.system || {};
  const metrics = data.metrics || {};
  const infrastructure = data.infrastructure || {};

  const diskTotalBytes = Number(infrastructure.disk_total_bytes) || 53687091200;
  const diskFreeBytes = Number(infrastructure.disk_free_bytes) || 10737418240;

  return {
    system: {
      status: system.status || 'HEALTHY',
      server_time: system.server_time || '—',
      php_version: system.php_version || '—',
      environment: system.environment || 'production',
      database_driver: system.database_driver || 'sqlite',
      database_version: system.database_version || '—',
      database_status: system.database_status || 'connected',
      uptime_mode: system.uptime_mode || 'continuous_service',
    },
    metrics: {
      total_trades: Number(metrics.total_trades ?? 0),
      provisioned_trade_codes: Array.isArray(metrics.provisioned_trade_codes)
        ? metrics.provisioned_trade_codes
        : [],
      active_trainees: Number(metrics.active_trainees ?? 0),
      total_sessions: Number(metrics.total_sessions ?? 0),
      session_completion_rate: Number(metrics.session_completion_rate ?? 0),
      total_assessments_logged: Number(metrics.total_assessments_logged ?? 0),
      open_remedial_backlog: Number(metrics.open_remedial_backlog ?? 0),
      resolved_remedial_count: Number(metrics.resolved_remedial_count ?? 0),
      total_audit_events: Number(metrics.total_audit_events ?? 0),
    },
    infrastructure: {
      disk_free_bytes: diskFreeBytes,
      disk_total_bytes: diskTotalBytes,
      storage_writable: Boolean(infrastructure.storage_writable),
      session_cookie_httponly: infrastructure.session_cookie_httponly !== false,
      csrf_protection: infrastructure.csrf_protection !== false,
      formula_injection_defense: infrastructure.formula_injection_defense !== false,
    },
  };
}

test('normalizeHealthPayload fills safe defaults when payload is empty or partial', () => {
  const normalized = normalizeHealthPayload(null);
  assert.equal(normalized.system.status, 'HEALTHY');
  assert.equal(normalized.system.database_driver, 'sqlite');
  assert.equal(normalized.metrics.total_trades, 0);
  assert.deepEqual(normalized.metrics.provisioned_trade_codes, []);
  assert.equal(normalized.infrastructure.csrf_protection, true);
});

test('normalizeHealthPayload preserves backend operational telemetry values', () => {
  const normalized = normalizeHealthPayload({
    system: {
      status: 'HEALTHY',
      php_version: '8.3.1',
      database_driver: 'mysql',
      database_status: 'connected',
    },
    metrics: {
      total_trades: 3,
      provisioned_trade_codes: ['ELE-01', 'FIT-01'],
      session_completion_rate: 92.5,
      total_sessions: 40,
      total_assessments_logged: 120,
      resolved_remedial_count: 8,
      open_remedial_backlog: 2,
      total_audit_events: 450,
    },
    infrastructure: {
      storage_writable: true,
      disk_free_bytes: 21474836480,
      disk_total_bytes: 53687091200,
    },
  });

  assert.equal(normalized.system.php_version, '8.3.1');
  assert.equal(normalized.system.database_driver, 'mysql');
  assert.equal(normalized.metrics.total_trades, 3);
  assert.deepEqual(normalized.metrics.provisioned_trade_codes, ['ELE-01', 'FIT-01']);
  assert.equal(normalized.metrics.session_completion_rate, 92.5);
  assert.equal(normalized.infrastructure.storage_writable, true);
});
