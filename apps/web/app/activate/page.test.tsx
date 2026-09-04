import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import ActivatePage from './page';

describe('ActivatePage', () => {
  it('renders password confirmation and rejects a mismatch in the browser', () => {
    window.history.replaceState({}, '', '/activate?token=test-token');
    render(<ActivatePage />);

    fireEvent.change(screen.getByLabelText(/password baru/i), {
      target: { value: 'a-secure-password' },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi password/i), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan akun' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Konfirmasi password tidak cocok.');
  });
});
