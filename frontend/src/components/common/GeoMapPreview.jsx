import { MapPin, ExternalLink } from 'lucide-react';

export default function GeoMapPreview({ latitude, longitude, accuracy, locationLabel, capturedAt, height = 180 }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = Number.isFinite(lat) && Number.isFinite(lng);

  if (!valid) {
    return (
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-secondary)',
          fontSize: '0.82rem',
          textAlign: 'center',
        }}
      >
        No GPS coordinates captured yet.
      </div>
    );
  }

  const delta = 0.004;
  const bbox = `${(lng - delta).toFixed(6)},${(lat - delta).toFixed(6)},${(lng + delta).toFixed(6)},${(lat + delta).toFixed(6)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const gmapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
      <iframe
        title={`Geo Map ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
        src={osmEmbedUrl}
        style={{ width: '100%', height: `${height}px`, border: 0, display: 'block' }}
        loading="lazy"
      />
      <div
        style={{
          padding: '0.5rem 0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          background: '#ffffff',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
          <MapPin size={14} color="#2563eb" />
          <strong>{lat.toFixed(6)}, {lng.toFixed(6)}</strong>
          {accuracy ? <span style={{ color: 'var(--text-secondary)' }}>(±{Math.round(Number(accuracy))}m)</span> : null}
          {locationLabel ? <span style={{ color: 'var(--text-secondary)' }}>· {locationLabel}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {capturedAt ? <span style={{ color: 'var(--text-tertiary)' }}>{capturedAt}</span> : null}
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', fontWeight: 600 }}
          >
            Open Map <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
