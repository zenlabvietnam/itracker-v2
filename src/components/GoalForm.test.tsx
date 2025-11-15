import { render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import GoalForm from './GoalForm';
import { supabase } from '../lib/supabaseClient';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import type { Goal } from '../types';

// Mock the toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
    const mockGoal: Goal = {
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

    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/% of total income/i));

    await user.type(screen.getByLabelText(/allocation value/i), '10');

    await user.click(screen.getByText(/add goal/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('goals');
      expect((supabase as any).insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Car',
          target_amount: 20000,
          allocation_type: 'PERCENT_TOTAL',
          allocation_value: 10,
          user_id: 'test-user-id',
        })
      );
      expect(mockOnSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Goal saved successfully!');
    });
  });

  it.skip('shows income source dropdown when allocation type is specific income', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'source-1', name: 'Salary' }], error: null }),
    } as any);

    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);

    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/% of specific source/i));

    const incomeSourceSelect = await screen.findByRole('combobox', { name: /income source/i });
    expect(incomeSourceSelect).toBeInTheDocument();

    await user.click(incomeSourceSelect);
    const incomeListbox = await screen.findByRole('listbox');
    await user.click(within(incomeListbox).getByText(/salary/i));

    expect(screen.getByText(/salary/i)).toBeInTheDocument();
  });

  it('submits edited goal successfully', async () => {
    const user = userEvent.setup();
    const mockGoal: Goal = {
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
      expect((supabase as any).update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Edited Vacation',
          target_amount: 1800,
        })
      );
      expect((supabase as any).eq).toHaveBeenCalledWith('id', 'goal-1');
      expect(mockOnSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Goal saved successfully!');
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} isOverAllocated={false} />);
    await user.click(screen.getByText(/cancel/i));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
