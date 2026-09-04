import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import HomePage from './page';

describe('HomePage', () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
  });

  it('redirects visitors to the application login page', () => {
    HomePage();

    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });
});
