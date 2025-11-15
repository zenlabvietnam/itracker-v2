import { vi } from 'vitest';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null, data: [] }),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  rpc: vi.fn().mockResolvedValue({ error: null, data: [] }),
  removeChannel: vi.fn(),
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
};

// This allows us to chain methods like supabase.from('...').select('...').eq('...', '...')
// and have it resolve with a mock value.
mockSupabase.from.mockImplementation(() => mockSupabase);
mockSupabase.select.mockImplementation(() => mockSupabase);
mockSupabase.insert.mockImplementation(() => mockSupabase);
mockSupabase.update.mockImplementation(() => mockSupabase);

export const supabase = mockSupabase;
