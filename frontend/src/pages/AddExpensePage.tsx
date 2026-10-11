import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addExpense } from '../store/expensesSlice';
import { parseAmount } from '../lib/money';
import { validateExpense } from '../lib/validation';
import type { Split } from '../types';

export default function AddExpensePage() {
  const { members } = useAppSelector((state) => state.trip);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');

  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [percentShares, setPercentShares] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleMemberToggle = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const buildSplitObject = (): Split => {
    if (splitType === 'equal') {
      return { type: 'equal', memberIds: selectedMembers };
    }
    if (splitType === 'exact') {
      const shares: Record<string, number> = {};
      Object.keys(exactShares).forEach((k) => {
        shares[k] = parseAmount(exactShares[k]);
      });
      return { type: 'exact', shares };
    }
    const pShares: Record<string, number> = {};
    Object.keys(percentShares).forEach((k) => {
      pShares[k] = parseFloat(percentShares[k]) || 0;
    });
    return { type: 'percent', shares: pShares };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = parseAmount(amountInput);
    const split = buildSplitObject();

    const validationErrors = validateExpense(
      description,
      amountPaise,
      paidBy,
      date,
      category,
      split
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newExpense = {
      id: 'e' + Date.now(), // simple unique id generator
      description,
      amount: amountPaise,
      paidBy,
      date,
      category,
      split,
    };

    dispatch(addExpense(newExpense));
    navigate('/', { state: { message: 'Expense added successfully' } });
  };

  return (
    <div className="add-expense-page">
      <form onSubmit={handleSubmit} className="expense-form">
        <h2>Add New Expense</h2>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={errors.description ? 'error-input' : ''}
          />
          {errors.description && (
            <span className="error-text">{errors.description}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className={errors.amount ? 'error-input' : ''}
            />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>

          <div className="form-group half">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? 'error-input' : ''}
            />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="paidBy">Paid By</label>
            <select
              id="paidBy"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={errors.paidBy ? 'error-input' : ''}
            >
              <option value="">Select payer</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.paidBy && <span className="error-text">{errors.paidBy}</span>}
          </div>

          <div className="form-group half">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={errors.category ? 'error-input' : ''}
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Stay">Stay</option>
              <option value="Activities">Activities</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>
        </div>

        <fieldset className="split-section">
          <legend>Split Method</legend>
          <div className="split-types">
            <label>
              <input
                type="radio"
                name="splitType"
                checked={splitType === 'equal'}
                onChange={() => setSplitType('equal')}
              />{' '}
              Equally
            </label>
            <label>
              <input
                type="radio"
                name="splitType"
                aria-label="Split exact"
                checked={splitType === 'exact'}
                onChange={() => setSplitType('exact')}
              />{' '}
              Exact Amounts
            </label>
            <label>
              <input
                type="radio"
                name="splitType"
                checked={splitType === 'percent'}
                onChange={() => setSplitType('percent')}
              />{' '}
              Percentages
            </label>
          </div>

          {errors.split && (
            <div className="error-text block-error">{errors.split}</div>
          )}

          <div className="split-details">
            {members.map((m) => (
              <div key={m.id} className="split-member-row">
                <span className="member-name">{m.name}</span>

                {splitType === 'equal' && (
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(m.id)}
                    onChange={() => handleMemberToggle(m.id)}
                    aria-label={`Include ${m.name} in equal split`}
                  />
                )}

                {splitType === 'exact' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={exactShares[m.id] || ''}
                    onChange={(e) =>
                      setExactShares({ ...exactShares, [m.id]: e.target.value })
                    }
                    aria-label={`Exact amount for ${m.name}`}
                  />
                )}

                {splitType === 'percent' && (
                  <div className="percent-input-wrapper">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={percentShares[m.id] || ''}
                      onChange={(e) =>
                        setPercentShares({ ...percentShares, [m.id]: e.target.value })
                      }
                      aria-label={`Percentage for ${m.name}`}
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Expense
          </button>
        </div>
      </form>
    </div>
  );
}
