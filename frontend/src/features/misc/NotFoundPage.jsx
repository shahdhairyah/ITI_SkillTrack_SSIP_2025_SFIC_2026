import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { roleHome } from '../../lib/format';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="center-page">
      <div className="center-card">
        <span className="stat-icon stat-icon-blue"><Compass size={24} /></span>
        <h1>Page not found</h1>
        <p>The page you requested does not exist in this workspace.</p>
        <Link to={user ? roleHome(user.role) : '/'} className="btn btn-primary">
          {user ? 'Return to dashboard' : 'Return home'}
        </Link>
      </div>
    </div>
  );
}
