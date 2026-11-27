CREATE TABLE IF NOT EXISTS itis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL DEFAULT '',
    city VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO itis (name, code, city, state, status)
SELECT * FROM (SELECT 'Government ITI Kubernagar' AS name, 'GUJ-AMD-01' AS code, 'Ahmedabad' AS city, 'Gujarat' AS state, 'active' AS status) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-AMD-01');

INSERT INTO itis (name, code, city, state, status)
SELECT * FROM (SELECT 'Government ITI Majura Gate' AS name, 'GUJ-SRT-01' AS code, 'Surat' AS city, 'Gujarat' AS state, 'active' AS status) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-SRT-01');

INSERT INTO itis (name, code, city, state, status)
SELECT * FROM (SELECT 'Government ITI Aji Dam' AS name, 'GUJ-RJK-01' AS code, 'Rajkot' AS city, 'Gujarat' AS state, 'active' AS status) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM itis WHERE code = 'GUJ-RJK-01');
