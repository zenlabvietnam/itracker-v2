import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GoalsPage from './GoalsPage';
import { supabase } from '../lib/supabaseClient';

// Mock the GoalForm component
vi.mock('../components/GoalForm', () => ({
  default: vi.fn(() => <div data-testid="mock-goal-form">Mock Goal Form</div>),
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
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    render(
      <MemoryRouter>
        <GoalsPage session={mockSession} />
      </MemoryRouter>
    );
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
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockGoalsData, error: null }),
    } as any);

    render(
      <MemoryRouter>
        <GoalsPage session={mockSession} />
      </MemoryRouter>
    );

    await screen.findByText(/your financial goals/i);
    expect(screen.getByText(/dream vacation/i)).toBeInTheDocument();
  });

  it('renders message when no goals are set', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    render(
      <MemoryRouter>
        <GoalsPage session={mockSession} />
      </MemoryRouter>
    );

    await screen.findByText(/no goals set yet/i);
  });

  it('renders error message if fetching fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } }),
    } as any);

    render(
      <MemoryRouter>
        <GoalsPage session={mockSession} />
      </MemoryRouter>
    );

    await screen.findByText(/error: failed to fetch/i);
  });
});
