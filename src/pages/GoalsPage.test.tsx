import { render, screen } from '@testing-library/react';

describe('GoalsPage', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.resetModules(); // Reset modules before each test
  });

  it('renders loading state initially', async () => {
    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);
    expect(screen.getByText(/loading goals.../i)).toBeInTheDocument();
  });

  it('renders goals correctly after fetching', async () => {
    const mockSelect = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: '1',
          name: 'Dream Vacation',
          target_amount: 50000000,
          current_amount: 25000000,
          allocation_type: 'percentage_total_income',
          allocation_value: 10,
          allocation_cycle: 'monthly',
          source_income_id: null,
        },
        {
          id: '2',
          name: 'New Car',
          target_amount: 300000000,
          current_amount: 50000000,
          allocation_type: 'fixed_amount_specific_income',
          allocation_value: 5000000,
          allocation_cycle: 'monthly',
          source_income_id: 'some-income-id',
        },
      ],
      error: null,
    });

    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: () => ({ select: mockSelect }),
      },
    }));

    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);

    await screen.findByText(/your financial goals/i);
    expect(screen.getByText(/add new goal/i)).toBeInTheDocument();
    expect(screen.getByText(/dream vacation/i)).toBeInTheDocument();
    expect(screen.getByText(/new car/i)).toBeInTheDocument();
    expect(screen.getByText(/progress: 25,000,000/i)).toBeInTheDocument();
    expect(screen.getByText(/progress: 50,000,000/i)).toBeInTheDocument();
  });

  it('renders message when no goals are set', async () => {
    const mockSelect = vi.fn().mockResolvedValueOnce({ data: [], error: null });

    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: () => ({ select: mockSelect }),
      },
    }));

    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);

    await screen.findByText(/no goals set yet. start by adding a new goal!/i);
  });

  it('renders error message if fetching fails', async () => {
    const mockSelect = vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });

    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: () => ({ select: mockSelect }),
      },
    }));

    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);

    await screen.findByText(/error: failed to fetch/i);
  });
});
