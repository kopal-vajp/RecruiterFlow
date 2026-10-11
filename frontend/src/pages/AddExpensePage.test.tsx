import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect } from 'vitest';
import AddExpensePage from './AddExpensePage';
import expensesReducer from '../store/expensesSlice';

const renderWithProviders = (component: React.ReactElement = <AddExpensePage />) => {
  const store = configureStore({
    reducer: { trip: expensesReducer },
    preloadedState: {
      trip: {
        members: [
          { id: 'm1', name: 'Aarav' },
          { id: 'm2', name: 'Diya' },
        ],
        expenses: [],
      },
    },
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('AddExpensePage', () => {
  it('shows validation errors for empty/invalid submission', () => {
    renderWithProviders();

    const saveButton = screen.getByText(/Save Expense/i);
    fireEvent.click(saveButton);

    // Description, amount, and payer should show errors
    expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Amount must be more than ₹20/i)).toBeInTheDocument();
  });

  it('allows user to fill out and submit a valid expense', () => {
    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Dinner' },
    });
    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: '1500' },
    });

    const saveButton = screen.getByText(/Save Expense/i);
    fireEvent.click(saveButton);

    // If successful, validation errors should not be present
    expect(screen.queryByText(/Description is required/i)).not.toBeInTheDocument();
  });
});
