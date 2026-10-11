import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { deleteExpense } from '../store/expensesSlice';
import { calculateBalances } from '../lib/balances';
import { formatINR } from '../lib/money';
import type { Split } from '../types';

export default function ExpensesPage() {
  const { expenses, members } = useAppSelector((state) => state.trip);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const [categoryFilter, setCategoryFilter] = useState('All');

  // Handle flash message from router state
  const locationState = location.state as { message?: string } | null;
  const message = locationState?.message;
  if (message) {
    // Clear the state so it doesn't persist on reload
    window.history.replaceState({}, document.title);
  }

  const filteredExpenses =
    categoryFilter === 'All'
      ? expenses
      : expenses.filter((e) => e.category === categoryFilter);

  const totalShown = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balances = calculateBalances(members, expenses);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      dispatch(deleteExpense(id));
    }
  };

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name || 'Unknown';

  const formatSplitLabel = (split: Split) => {
    if (split.type === 'equal') return `Equally, ${split.memberIds.length} people`;
    if (split.type === 'exact') return 'Exact amounts';
    if (split.type === 'percent') return 'Percentages';
    return 'Unknown split';
  };

  return (
    <div className="expenses-page">
      {message && <div className="flash-success">{message}</div>}

      <section className="balances-section">
        <h2>Balances</h2>
        <div className="balances-grid">
          {balances.map((b) => (
            <div
              key={b.memberId}
              className={`balance-card ${b.amount > 0 ? 'positive' : b.amount < 0 ? 'negative' : 'neutral'
                }`}
            >
              <h3>{getMemberName(b.memberId)}</h3>
              <p>
                {b.amount === 0
                  ? 'Settled up'
                  : b.amount > 0
                    ? `Gets back ${formatINR(b.amount)}`
                    : `Owes ${formatINR(Math.abs(b.amount))}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="expenses-section">
        <div className="expenses-header">
          <h2>Expenses</h2>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Stay">Stay</option>
            <option value="Activities">Activities</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <p className="total-shown">
          Total shown: <strong>{formatINR(totalShown)}</strong>
        </p>

        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses found in this category.</p>
            <button
              onClick={() => navigate('/expenses/new')}
              className="btn btn-primary"
            >
              Add one now
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Paid By</th>
                  <th>Amount</th>
                  <th>Split</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td>{expense.description}</td>
                    <td>{expense.category}</td>
                    <td>{getMemberName(expense.paidBy)}</td>
                    <td className="amount-cell">{formatINR(expense.amount)}</td>
                    <td>{formatSplitLabel(expense.split)}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="btn btn-danger btn-sm"
                        aria-label={`Delete expense ${expense.description}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
