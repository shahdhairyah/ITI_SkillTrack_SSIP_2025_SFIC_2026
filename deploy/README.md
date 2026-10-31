# ITI SkillTrack: Production Deployment Package

**Digital Skill Training, Attendance and Competency Tracking System for ITI Students**  
*Built with React 19 SPA + PHP 8.3 REST API + MySQL 8.x / SQLite PDO (Phases 1, 2, and 3 Complete)*

---

## Package Contents

```
deploy/
├── htdocs/                     # Upload contents directly to your server web root
│   ├── index.html              # React 19 SPA production entry
│   ├── assets/                 # Optimized JS & CSS bundles
│   ├── favicon.svg             # SkillTrack logo
│   ├── icons.svg               # SVG icons
│   ├── .htaccess               # React Router rewrite & /api passthrough
│   └── api/                    # Backend REST API
│       ├── .env                # Database & app configuration
│       ├── .htaccess           # Internal protection & front controller rewrite
│       ├── public/
│       │   └── index.php       # API Front Controller
│       ├── src/                # PSR-4 Controllers, Middleware, Services, Support
│       └── database/
│           ├── iti_skilltrack.sqlite  # Pre-seeded database (works instantly)
│           ├── migrations/     # Migration SQL scripts
│           └── seeds/          # Seed SQL scripts
├── database/
│   ├── iti_skilltrack_full.sql # Consolidated MySQL 8.x / MariaDB full dump
│   └── iti_skilltrack.sqlite   # Standalone pre-seeded SQLite database
├── nginx.conf.example          # Production Nginx site block for VPS
├── apache.vhost.example        # Production Apache 2.4 VirtualHost for VPS
├── README.txt                  # Plain-text quick deployment guide
└── README.md                   # This documentation guide
```

---

## Deployment Options

### Option 1: Shared Hosting (cPanel / InfinityFree / DirectAdmin)

1. Open your hosting control panel **File Manager** or connect via **FTP** (FileZilla, Cyberduck).
2. Navigate to your web root (`htdocs` or `public_html`).
3. Upload all files and folders located **INSIDE** `deploy/htdocs/`.
   > **Note:** Upload the contents of `htdocs/`, not the `htdocs` folder itself.
4. Verify that hidden files were uploaded:
   - `htdocs/.htaccess`
   - `htdocs/api/.htaccess`
   - `htdocs/api/.env`
5. **Instant Launch:** The system includes a ready-to-use SQLite database at `htdocs/api/database/iti_skilltrack.sqlite`. Your app is live immediately!

---

### Option 2: Production MySQL Setup

If you prefer using your hosting provider's MySQL / MariaDB service:

1. Open **phpMyAdmin** in your hosting control panel.
2. Select your target database.
3. Click **Import** and choose [`deploy/database/iti_skilltrack_full.sql`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/deploy/database/iti_skilltrack_full.sql).
4. Edit `htdocs/api/.env` on the server:
   ```ini
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=your_database_name
   DB_USERNAME=your_database_user
   DB_PASSWORD=your_database_password
   ```
5. Save the file. The system seamlessly connects to MySQL while retaining SQLite as an automatic fallback if MySQL becomes temporarily unavailable.

---

### Option 3: VPS / Dedicated Server (Ubuntu / Debian)

```bash
# 1. Copy web files
sudo mkdir -p /var/www/iti_skilltrack
sudo cp -r deploy/htdocs /var/www/iti_skilltrack/

# 2. Permissions
sudo chown -R www-data:www-data /var/www/iti_skilltrack/htdocs
sudo chmod -R 755 /var/www/iti_skilltrack/htdocs
sudo chmod -R 775 /var/www/iti_skilltrack/htdocs/api/database

# 3. Nginx setup (using deploy/nginx.conf.example)
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/iti_skilltrack
sudo ln -s /etc/nginx/sites-available/iti_skilltrack /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Demo Accounts

All demo accounts use password: **`Password@123`**

| Role | Username | Email | Permissions / Scope |
|---|---|---|---|
| **Administrator** | `admin` | `admin@itiskilltrack.org` | Full institute administration, reports, batch management |
| **Instructor** | `instructor` | `rajesh.sharma@itiskilltrack.org` | Assigned to batch `EL-2026-A`; schedules sessions, marks & submits registers |
| **Student 1** | `student` | `amit.kumar@student.iti.org` | Enrolled trainee (100% attendance, exam eligible) |
| **Student 2** | `priya` | `priya.verma@student.iti.org` | Enrolled trainee |
| **Student 3** | `rahul` | `rahul.singh@student.iti.org` | Enrolled trainee (attendance warning threshold testing) |

---

## Verification & Health Check

Visit `https://your-domain.com/api/v1/health` in your browser. Expected response:
```json
{
  "status": "success",
  "data": {
    "app": "ITI SkillTrack API",
    "version": "1.0.0",
    "database": {
      "status": "healthy",
      "connection": "sqlite",
      "tables_count": 26
    }
  }
}
```

