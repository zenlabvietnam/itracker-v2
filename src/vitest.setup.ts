import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('./lib/supabaseClient', async () => {
  const { supabase } = await vi.importActual('./__mocks__/supabaseClient');
  return { supabase };
});

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as typeof globalThis & { HTMLElement: any };
  g.HTMLElement.prototype.hasPointerCapture = vi.fn();
  g.HTMLElement.prototype.releasePointerCapture = vi.fn();
  g.HTMLElement.prototype.scrollIntoView = vi.fn();
});
