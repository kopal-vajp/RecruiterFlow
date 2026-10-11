import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <h2>404 - Page Not Found</h2>
      <p>This route does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to Expenses
      </Link>
    </div>
  );
}
