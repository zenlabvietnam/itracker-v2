import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as typeof globalThis & { HTMLElement: any };
  g.HTMLElement.prototype.hasPointerCapture = vi.fn();
  g.HTMLElement.prototype.releasePointerCapture = vi.fn();
  g.HTMLElement.prototype.scrollIntoView = vi.fn();
});
