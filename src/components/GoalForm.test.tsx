import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import GoalForm from './GoalForm';

describe('GoalForm', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  };
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockIncomeSources = [
    { id: 'source-1', name: 'Salary' },
    { id: 'source-2', name: 'Freelance' },
  ];

  beforeEach(() => {
    vi.resetModules();
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
  });

  const setupMocks = (mocks: any) => {
    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: (tableName: string) => mocks[tableName] || {},
      },
    }));
  };

  it('renders in add mode correctly', async () => {
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
    });
    const GoalForm = (await import('./GoalForm')).default;
    await act(async () => {
      render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} />);
    });
    await waitFor(() => {
      expect(screen.getByText(/add new goal/i)).toBeInTheDocument();
    });
  });

  it('renders in edit mode with pre-filled data', async () => {
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
    });
    const GoalForm = (await import('./GoalForm')).default;
    const mockGoal = {
      id: 'goal-1',
      name: 'Edit Goal',
      target_amount: 10000000,
      allocation_type: 'PERCENT_TOTAL',
      allocation_value: 10,
    };
    await act(async () => {
      render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} goal={mockGoal} />);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/goal name/i)).toHaveValue('Edit Goal');
      expect(screen.getByLabelText(/target amount/i)).toHaveValue(10000000);
      expect(screen.getByRole('combobox', { name: /allocation type/i })).toHaveTextContent(/% of Total Income/i);
      expect(screen.getByLabelText(/allocation value/i)).toHaveValue(10);
    });
  });

  it('shows income source dropdown when allocation type is specific income', async () => {
    const user = userEvent.setup();
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
    });
    const GoalForm = (await import('./GoalForm')).default;
    await act(async () => {
      render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} />);
    });

    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await user.click(screen.getByRole('option', { name: /% of specific source/i }));

    const incomeSourceDropdown = await screen.findByRole('combobox', { name: /income source/i });
    expect(incomeSourceDropdown).toBeInTheDocument();
    expect(incomeSourceDropdown).toHaveTextContent(/select income source/i);

    await user.click(incomeSourceDropdown);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /salary/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /freelance/i })).toBeInTheDocument();
    });
  });

  it('shows allocation cycle dropdown when allocation type is fixed amount', async () => {
    const user = userEvent.setup();
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
    });
    const GoalForm = (await import('./GoalForm')).default;
    await act(async () => {
      render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} />);
    });

    await user.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await user.click(screen.getByRole('option', { name: /fixed amount from total/i }));

    const allocationCycleDropdown = await screen.findByRole('combobox', { name: /allocation cycle/i });
    expect(allocationCycleDropdown).toBeInTheDocument();
  });

  it('handles form submission for adding a new goal', async () => {
    const user = userEvent.setup();
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
      goals: { insert: mockInsert },
    });

    const GoalForm = (await import('./GoalForm')).default;

    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} />);

    await userEvent.type(screen.getByLabelText(/goal name/i), 'New Goal');
    await userEvent.type(screen.getByLabelText(/target amount/i), '5000');

    await userEvent.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await userEvent.click(screen.getByRole('option', { name: /% of specific source/i }));

    const incomeSourceDropdown = await screen.findByRole('combobox', { name: /income source/i });
    await userEvent.click(incomeSourceDropdown);
    await userEvent.click(screen.getByRole('option', { name: /salary/i }));

    await userEvent.type(screen.getByLabelText(/allocation value/i), '10');

    await userEvent.click(screen.getByRole('button', { name: /add goal/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Goal',
        target_amount: 5000,
        allocation_value: 10,
        allocation_type: 'PERCENT_SOURCE',
        source_income_id: 'source-1',
      }));
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('handles form submission for editing an existing goal', async () => {
    const user = userEvent.setup();
    const mockUpdate = vi.fn().mockResolvedValue({ error: null });
    setupMocks({
      income_sources: {
        select: () => ({ eq: () => ({ data: mockIncomeSources, error: null }) }),
      },
      goals: { update: (data) => ({ eq: () => mockUpdate(data) }) },
    });

    const GoalForm = (await import('./GoalForm')).default;
    const mockGoal = {
      id: 'goal-1',
      name: 'Old Goal',
      target_amount: 1000,
      allocation_type: 'FIXED_TOTAL',
      allocation_value: 5,
      allocation_cycle: 'monthly',
    };

    render(<GoalForm session={mockSession} onSave={mockOnSave} onCancel={mockOnCancel} goal={mockGoal} />);

    await userEvent.clear(screen.getByLabelText(/goal name/i));
    await userEvent.type(screen.getByLabelText(/goal name/i), 'Updated Goal');

    await userEvent.click(screen.getByRole('combobox', { name: /allocation type/i }));
    await userEvent.click(screen.getByRole('option', { name: /fixed amount from total/i }));

    const allocationCycleDropdown = await screen.findByRole('combobox', { name: /allocation cycle/i });
    await userEvent.click(allocationCycleDropdown);
    await userEvent.click(screen.getByRole('option', { name: /yearly/i }));

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Goal',
        allocation_cycle: 'yearly',
      }));
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});