import { render, screen } from '@testing-library/react';
import { vi } from 'vitest'; // Import vi from vitest

// Mock the GoalForm component
vi.mock('../components/GoalForm', () => ({
  default: vi.fn((props) => {
    // eslint-disable-next-line react/prop-types
    return (
      <div data-testid="mock-goal-form">
        Mock Goal Form
        <button onClick={props.onSave}>Mock Save</button>
        <button onClick={props.onCancel}>Mock Cancel</button>
      </div>
    );
  }),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((cb) => cb),
    control: {},
    watch: vi.fn(),
    formState: { errors: {} },
    setValue: vi.fn(),
  })),
  Controller: vi.fn(({ render }) => render({ field: { onChange: vi.fn(), value: '' } })),
}));

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

  // Helper to mock supabase query chain
  const mockSupabaseQuery = (mockData: any, mockError: any = null) => ({
    select: vi.fn().mockReturnThis(), // Allows chaining .select()
    eq: vi.fn().mockResolvedValueOnce({ data: mockData, error: mockError }), // Mocks the .eq() call
  });

  it('renders loading state initially', async () => {
    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);
    expect(screen.getByText(/loading goals.../i)).toBeInTheDocument();
  });

  it('renders goals correctly after fetching', async () => {
    const mockGoalsData = [
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
    ];

    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: vi.fn((tableName) => {
          if (tableName === 'goals') {
            return mockSupabaseQuery(mockGoalsData);
          }
          if (tableName === 'income_sources') {
            return mockSupabaseQuery([]); // Mock empty income sources for this test
          }
          return mockSupabaseQuery([]);
        }),
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
    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: vi.fn((tableName) => {
          if (tableName === 'goals') {
            return mockSupabaseQuery([]);
          }
          if (tableName === 'income_sources') {
            return mockSupabaseQuery([]);
          }
          return mockSupabaseQuery([]);
        }),
      },
    }));

    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);

    await screen.findByText(/no goals set yet. start by adding a new goal!/i);
  });

  it('renders error message if fetching fails', async () => {
    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        from: vi.fn((tableName) => {
          if (tableName === 'goals') {
            return mockSupabaseQuery(null, { message: 'Failed to fetch' });
          }
          if (tableName === 'income_sources') {
            return mockSupabaseQuery([]);
          }
          return mockSupabaseQuery([]);
        }),
      },
    }));

    const GoalsPage = (await import('./GoalsPage')).default;
    render(<GoalsPage session={mockSession} />);

    await screen.findByText(/error: failed to fetch/i);
  });
});
