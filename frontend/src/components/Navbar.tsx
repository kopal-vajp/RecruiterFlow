import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-brand">Trip Splitter</div>
      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Expenses
        </NavLink>
        <NavLink
          to="/expenses/new"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Add Expense
        </NavLink>
      </div>
    </nav>
  );
}
