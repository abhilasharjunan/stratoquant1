import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/animations', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ResetPasswordPage from './page';

describe('ResetPasswordPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<ResetPasswordPage />)).not.toThrow();
  });

  it('shows error when no token provided', () => {
    render(<ResetPasswordPage />);
    const errors = screen.getAllByText('Invalid or missing reset token.');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('renders password fields', () => {
    render(<ResetPasswordPage />);
    const inputs = screen.getAllByPlaceholderText(/password/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('has back link', () => {
    render(<ResetPasswordPage />);
    const links = screen.getAllByText('Back to Sign In');
    expect(links.length).toBeGreaterThan(0);
  });
});
