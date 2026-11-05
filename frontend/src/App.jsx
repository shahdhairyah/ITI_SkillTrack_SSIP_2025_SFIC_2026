import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/providers/AuthProvider';
import { ToastProvider } from './app/providers/ToastProvider';
import AppLayout from './components/layout/AppLayout';
import { ProtectedRoute, RoleRoute } from './components/layout/RouteGuards';
import HomePage from './features/home/HomePage';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/dashboard/AdminDashboard';
import InstructorDashboard from './features/dashboard/InstructorDashboard';
import StudentDashboard from './features/dashboard/StudentDashboard';
import StudentsPage from './features/students/StudentsPage';
import InstructorsPage from './features/instructors/InstructorsPage';
import TradesPage from './features/organization/TradesPage';
import AcademicPeriodsPage from './features/organization/AcademicPeriodsPage';
import BatchesPage from './features/organization/BatchesPage';
import InstituteSettingsPage from './features/organization/InstituteSettingsPage';
import UsersPage from './features/users/UsersPage';
import InstructorBatchesPage from './features/instructor/InstructorBatchesPage';
import ProfilePage from './features/profile/ProfilePage';
import SessionsPage from './features/attendance/SessionsPage';
import AttendanceRegisterPage from './features/attendance/AttendanceRegisterPage';
import AttendanceReportPage from './features/attendance/AttendanceReportPage';
import StudentAttendancePage from './features/attendance/StudentAttendancePage';
import CurriculumPage from './features/competency/CurriculumPage';
import AssessmentWorkspacePage from './features/competency/AssessmentWorkspacePage';
import RemedialSupportPage from './features/remedial/RemedialSupportPage';
import StudentSkillsPage from './features/competency/StudentSkillsPage';
import NotFoundPage from './features/misc/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="profile" element={<ProfilePage />} />

              {/* Phase 3 Shared Training & Attendance Routes */}
              <Route element={<RoleRoute roles={['administrator', 'instructor', 'monitoring_officer']} />}>
                <Route path="sessions" element={<SessionsPage />} />
                <Route path="sessions/:id/attendance" element={<AttendanceRegisterPage />} />
                <Route path="attendance/report" element={<AttendanceReportPage />} />
                {/* Phase 4 & 5 Shared Routes */}
                <Route path="curriculum" element={<CurriculumPage />} />
                <Route path="remedials" element={<RemedialSupportPage />} />
              </Route>

              {/* Phase 4 Instructor Assessments */}
              <Route element={<RoleRoute roles={['administrator', 'instructor']} />}>
                <Route path="assessments" element={<AssessmentWorkspacePage />} />
              </Route>

              <Route element={<RoleRoute roles={['administrator', 'monitoring_officer']} />}>
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/students" element={<StudentsPage />} />
                <Route path="admin/instructors" element={<InstructorsPage />} />
                <Route path="admin/trades" element={<TradesPage />} />
                <Route path="admin/academic-periods" element={<AcademicPeriodsPage />} />
                <Route path="admin/batches" element={<BatchesPage />} />
              </Route>

              <Route element={<RoleRoute roles={['administrator']} />}>
                <Route path="admin/users" element={<UsersPage />} />
                <Route path="admin/settings" element={<InstituteSettingsPage />} />
              </Route>

              <Route element={<RoleRoute roles={['instructor']} />}>
                <Route path="instructor/dashboard" element={<InstructorDashboard />} />
                <Route path="instructor/batches" element={<InstructorBatchesPage />} />
              </Route>

              <Route element={<RoleRoute roles={['student']} />}>
                <Route path="student/dashboard" element={<StudentDashboard />} />
                <Route path="student/attendance" element={<StudentAttendancePage />} />
                <Route path="student/skills" element={<StudentSkillsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
