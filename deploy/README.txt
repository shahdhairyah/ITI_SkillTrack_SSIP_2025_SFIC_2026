==============================================================================
ITI SkillTrack - Production Deployment Package (Phases 1, 2, and 3)
==============================================================================

Digital Skill Training, Attendance and Competency Tracking System for ITI Students
Built with React 19 SPA + PHP 8.3 REST API + MySQL 8.x / SQLite PDO

------------------------------------------------------------------------------
PACKAGE DIRECTORY STRUCTURE
------------------------------------------------------------------------------
deploy/
  htdocs/                  <- Upload CONTENTS to your web root (htdocs or public_html)
    index.html             <- React SPA production build
    assets/                <- CSS and JS bundles
    favicon.svg            <- SkillTrack branding icon
    icons.svg              <- SVG sprite
    .htaccess              <- Apache SPA routing + API passthrough
    api/                   <- Backend REST API
      .env                 <- Environment and database configuration
      .htaccess            <- Direct access protection & front controller rewrite
      public/index.php     <- Front controller (Phases 1, 2, 3 routes)
      src/                 <- PHP controllers, services, middleware, router
      database/
        iti_skilltrack.sqlite <- Pre-seeded SQLite database (ready to run immediately)
        migrations/        <- Migration SQL files
        seeds/             <- Seed SQL files
        migrate.php        <- CLI migration runner
  database/
    iti_skilltrack_full.sql <- Complete MySQL 8.x/MariaDB dump (Schema + Pilot Seed)
    iti_skilltrack.sqlite   <- Standalone pre-seeded SQLite database file
  nginx.conf.example       <- Nginx server block for VPS / Ubuntu deployment
  apache.vhost.example     <- Apache VirtualHost block for VPS deployment
  README.txt               <- This guide
  README.md                <- Markdown deployment guide

------------------------------------------------------------------------------
OPTION 1: INSTANT UPLOAD (cPanel / InfinityFree / Shared Apache)
------------------------------------------------------------------------------
1. Open your hosting File Manager or FTP client (FileZilla / WinSCP).
2. Upload all files INSIDE "deploy/htdocs/" into your server's public root
   ("htdocs" or "public_html").
   *IMPORTANT: Upload the contents of htdocs, not the htdocs folder itself.*
3. Ensure hidden dotfiles are uploaded:
     - htdocs/.htaccess
     - htdocs/api/.htaccess
     - htdocs/api/.env
4. Ensure write permissions for database folder:
     chmod 775 htdocs/api/database
     chmod 664 htdocs/api/database/iti_skilltrack.sqlite
5. Done! The application works immediately using the bundled SQLite database.
   Open your website URL in any browser.

------------------------------------------------------------------------------
OPTION 2: SWITCHING TO PRODUCTION MYSQL / MARIADB
------------------------------------------------------------------------------
If you prefer running against a dedicated MySQL server:
1. Open phpMyAdmin or your MySQL CLI.
2. Select your database.
3. Import the file:
     deploy/database/iti_skilltrack_full.sql
4. Edit "htdocs/api/.env" on your server:
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1          (or your MySQL hostname, e.g. sql308.epizy.com)
     DB_PORT=3306
     DB_DATABASE=your_db_name
     DB_USERNAME=your_db_user
     DB_PASSWORD=your_db_password
5. Save the file. The system will now use MySQL!
   *Note: DB_FALLBACK_SQLITE=true ensures the system stays online even if
   the MySQL connection experiences transient network issues.*

------------------------------------------------------------------------------
OPTION 3: VPS DEPLOYMENT (UBUNTU / DEBIAN / NGINX / APACHE)
------------------------------------------------------------------------------
1. Copy "deploy/htdocs/" to "/var/www/iti_skilltrack/htdocs":
     sudo mkdir -p /var/www/iti_skilltrack
     sudo cp -r deploy/htdocs /var/www/iti_skilltrack/
2. Grant web server ownership:
     sudo chown -R www-data:www-data /var/www/iti_skilltrack/htdocs
     sudo chmod -R 755 /var/www/iti_skilltrack/htdocs
     sudo chmod -R 775 /var/www/iti_skilltrack/htdocs/api/database
3. For Nginx:
     Copy "deploy/nginx.conf.example" to "/etc/nginx/sites-available/iti_skilltrack"
     sudo ln -s /etc/nginx/sites-available/iti_skilltrack /etc/nginx/sites-enabled/
     sudo nginx -t && sudo systemctl reload nginx
4. For Apache:
     Copy "deploy/apache.vhost.example" to "/etc/apache2/sites-available/iti_skilltrack.conf"
     sudo a2ensite iti_skilltrack.conf
     sudo a2enmod rewrite headers
     sudo systemctl reload apache2

------------------------------------------------------------------------------
PILOT DEMO ACCOUNTS (Password for all: Password@123)
------------------------------------------------------------------------------
Role           Username     Email                           Notes
-------------  -----------  ------------------------------  ---------------------
Administrator  admin        admin@itiskilltrack.org         Full Institute Access
Instructor     instructor   rajesh.sharma@itiskilltrack.org Batch EL-2026-A Staff
Student 1      student      amit.kumar@student.iti.org      100% Attendance (Eligible)
Student 2      priya        priya.verma@student.iti.org     Enrolled Trainee
Student 3      rahul        rahul.singh@student.iti.org     Attendance Warning (<80%)

------------------------------------------------------------------------------
VERIFICATION & HEALTH CHECK
------------------------------------------------------------------------------
After deploying, test the API health in your browser:
  https://your-domain.com/api/v1/health

Expected JSON response:
{
  "status": "success",
  "data": {
    "app": "ITI SkillTrack API",
    "version": "1.0.0",
    "php_version": "8.x",
    "database": {
      "status": "healthy",
      "connection": "sqlite" (or "mysql"),
      "tables_count": 26
    }
  }
}

------------------------------------------------------------------------------
SECURITY & HTTPS
------------------------------------------------------------------------------
When your domain has an SSL certificate (https://):
Edit "htdocs/api/.env":
  SESSION_SECURE_COOKIE=true
This instructs the server to transmit authentication cookies exclusively over HTTPS.
==============================================================================

