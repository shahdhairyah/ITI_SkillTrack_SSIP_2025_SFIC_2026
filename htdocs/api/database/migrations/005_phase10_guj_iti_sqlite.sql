CREATE TABLE IF NOT EXISTS itis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Gujarat',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO itis (name, code, city, state, status)
SELECT 'Government ITI Kubernagar', 'GUJ-AMD-01', 'Ahmedabad', 'Gujarat', 'active'
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-AMD-01');

INSERT INTO itis (name, code, city, state, status)
SELECT 'Government ITI Majura Gate', 'GUJ-SRT-01', 'Surat', 'Gujarat', 'active'
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-SRT-01');

INSERT INTO itis (name, code, city, state, status)
SELECT 'Government ITI Aji Dam', 'GUJ-RJK-01', 'Rajkot', 'Gujarat', 'active'
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-RJK-01');
