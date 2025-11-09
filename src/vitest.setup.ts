import { beforeAll } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  // @ts-expect-error - JSDOM doesn't have this, but Radix UI uses it
  global.HTMLElement.prototype.hasPointerCapture = vi.fn();
  global.HTMLElement.prototype.releasePointerCapture = vi.fn();
  global.HTMLElement.prototype.scrollIntoView = vi.fn();
});
