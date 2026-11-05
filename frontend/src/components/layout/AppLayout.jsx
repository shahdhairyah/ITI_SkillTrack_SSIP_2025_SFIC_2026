import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { initials, roleHome, toTitleCase } from '../../lib/format';

const NAV = {
  administrator: [
    { to: '/admin/dashboard', label: 'Institute Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Training Sessions & Labs', icon: CalendarDays },
    { to: '/attendance/report', label: 'Attendance Reports', icon: FileSpreadsheet },
    { to: '/curriculum', label: 'Curriculum & Rubrics', icon: BookOpen },
    { to: '/assessments', label: 'Practical Assessments', icon: Award },
    { to: '/remedials', label: 'Remedial Support Tasks', icon: Activity },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/instructors', label: 'Instructors', icon: Users },
    { to: '/admin/trades', label: 'Trades & Departments', icon: Building2 },
    { to: '/admin/academic-periods', label: 'Academic Periods', icon: CalendarDays },
    { to: '/admin/batches', label: 'Batches', icon: ClipboardList },
    { to: '/admin/users', label: 'User Roles & Access', icon: ShieldCheck },
    { to: '/admin/settings', label: 'Institute Settings', icon: Settings },
  ],
  instructor: [
    { to: '/instructor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/assessments', label: 'Practical Assessments', icon: Award },
    { to: '/remedials', label: 'Remedial Support Tasks', icon: Activity },
    { to: '/sessions', label: 'Training Sessions & Labs', icon: CalendarDays },
    { to: '/attendance/report', label: 'Attendance Reports', icon: FileSpreadsheet },
    { to: '/curriculum', label: 'Curriculum & Rubrics', icon: BookOpen },
    { to: '/instructor/batches', label: 'My Batches', icon: ClipboardList },
  ],
  student: [
    { to: '/student/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/student/skills', label: 'My Skills & Portfolio', icon: Award },
    { to: '/student/attendance', label: 'My Attendance & Exams', icon: CalendarDays },
  ],
  monitoring_officer: [
    { to: '/admin/dashboard', label: 'Institute Overview', icon: LayoutDashboard },
    { to: '/assessments', label: 'Practical Assessments', icon: Award },
    { to: '/remedials', label: 'Remedial Monitoring', icon: Activity },
    { to: '/sessions', label: 'Training Sessions & Labs', icon: CalendarDays },
    { to: '/attendance/report', label: 'Attendance Reports', icon: FileSpreadsheet },
    { to: '/curriculum', label: 'Curriculum & Rubrics', icon: BookOpen },
    { to: '/admin/students', label: 'Student Directory', icon: GraduationCap },
    { to: '/admin/instructors', label: 'Instructor Directory', icon: Users },
    { to: '/admin/trades', label: 'Trades', icon: Building2 },
    { to: '/admin/batches', label: 'Batches', icon: ClipboardList },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const navItems = NAV[user.role] || NAV.student;
  const displayName = user.profile?.name || user.username;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-container">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <Link to={roleHome(user.role)} className="brand-link">
            <div className="logo-badge">ST</div>
            <div className="brand-text">
              <h1>ITI SkillTrack</h1>
              <p>Phase 5 · Competency & Remedial</p>
            </div>
          </Link>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Workspace</div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="nav-label nav-label-spaced">Account</div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <UserRound size={18} />
            <span>My Profile</span>
          </NavLink>
          <button type="button" className="nav-item nav-item-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-inst">
            <Building2 size={16} />
            <div>
              <strong>{user.institute_name}</strong>
              <span>{user.institute_code}</span>
            </div>
          </div>
          <div className="sidebar-version">
            <Activity size={13} />
            API v1 · PHP + MySQL
          </div>
        </div>
      </aside>

      {menuOpen ? <button type="button" className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" /> : null}

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn mobile-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <span className="topbar-eyebrow">{user.role_label}</span>
              <span className="topbar-name">{displayName}</span>
            </div>
          </div>

          <div className="topbar-right">
            <span className="academic-badge">
              <Activity size={14} />
              {user.institute_code}
            </span>
            <Link to="/profile" className="user-pill">
              <div className="user-avatar">{initials(displayName)}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{toTitleCase(user.role)}</span>
              </div>
              <ChevronRight size={15} className="user-chevron" />
            </Link>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
