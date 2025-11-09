import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import GoalForm from './GoalForm';
import { supabase } from '../lib/supabaseClient';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner'; // Import toast
import type { Goal } from '../types'; // Import Goal

// Mock the toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock supabase client
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => ({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [
            { id: 'source-1', name: 'Salary', amount: 5000, cycle: 'monthly' },
            { id: 'source-2', name: 'Freelance', amount: 1000, cycle: 'weekly' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          data: [{ id: 'new-goal-id', name: 'New Goal', target_amount: 1000, current_amount: 0, user_id: 'test-user-id' }],
          error: null,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: 'edit-goal-id', name: 'Edited Goal', target_amount: 1200, current_amount: 0, user_id: 'test-user-id' }],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
};

const mockOnSave = vi.fn();
const mockOnCancel = vi.fn();

describe('GoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders add new goal form correctly', async () => {
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);

    expect(screen.getByLabelText(/goal name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target amount/i)).toBeInTheDocument();
    expect(screen.getByText(/add goal/i)).toBeInTheDocument();
  });

  it('renders edit goal form correctly with pre-filled data', async () => {
    const mockGoal: Goal = { // Explicitly cast to Goal
      id: 'goal-1',
      user_id: 'test-user-id',
      name: 'Vacation',
      target_amount: 1500,
      current_amount: 500,
      allocation_type: 'FIXED_TOTAL',
      allocation_value: 100,
      allocation_cycle: 'monthly',
      source_income_id: undefined,
    };
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} goal={mockGoal} isOverAllocated={false} />);

    expect(screen.getByLabelText(/goal name/i)).toHaveValue('Vacation');
    expect(screen.getByLabelText(/target amount/i)).toHaveValue(1500);
    expect(screen.getByText(/save changes/i)).toBeInTheDocument();
  });

  it('submits new goal successfully', async () => {
    const user = userEvent.setup();
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);

    await user.type(screen.getByLabelText(/goal name/i), 'New Car');
    await user.type(screen.getByLabelText(/target amount/i), '20000');

    // Select allocation type
    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await waitFor(() => screen.getByText(/percent of total income/i));
    await user.click(screen.getByText(/percent of total income/i));

    await user.type(screen.getByLabelText(/allocation value/i), '10');

    await user.click(screen.getByText(/add goal/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('goals');
      expect(supabase.from('goals').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Car',
          target_amount: 20000,
          allocation_type: 'PERCENT_TOTAL',
          allocation_value: 10,
          user_id: 'test-user-id',
        })
      );
      expect(mockOnSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Goal added successfully!');
    });
  });

  it('shows income source dropdown when allocation type is specific income', async () => {
    const user = userEvent.setup();
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);

    // Select allocation type "Percent from specific income source"
    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await waitFor(() => screen.getByText(/percent of specific source/i));
    await user.click(screen.getByText(/percent of specific source/i));

    // Check if income source dropdown appears
    const incomeSourceSelect = screen.getByRole('combobox', { name: /select income source/i });
    expect(incomeSourceSelect).toBeInTheDocument();

    // Select an income source
    await user.click(incomeSourceSelect);
    await waitFor(() => screen.getByText(/salary/i));
    await user.click(screen.getByText(/salary/i));

    expect(screen.getByText(/salary/i)).toBeInTheDocument();
  });

  it('submits edited goal successfully', async () => {
    const user = userEvent.setup();
    const mockGoal: Goal = { // Explicitly cast to Goal
      id: 'goal-1',
      user_id: 'test-user-id',
      name: 'Vacation',
      target_amount: 1500,
      current_amount: 500,
      allocation_type: 'FIXED_TOTAL',
      allocation_value: 100,
      allocation_cycle: 'monthly',
      source_income_id: undefined,
    };
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} goal={mockGoal} isOverAllocated={false} />);

    await user.clear(screen.getByLabelText(/goal name/i));
    await user.type(screen.getByLabelText(/goal name/i), 'Edited Vacation');
    await user.clear(screen.getByLabelText(/target amount/i));
    await user.type(screen.getByLabelText(/target amount/i), '1800');

    await user.click(screen.getByText(/save changes/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('goals');
      expect(supabase.from('goals').update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Edited Vacation',
          target_amount: 1800,
        })
      );
      expect(supabase.from('goals').update('goals').eq).toHaveBeenCalledWith('id', 'goal-1');
      expect(mockOnSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Goal updated successfully!');
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup(); // Added
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);
    await user.click(screen.getByText(/cancel/i));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
