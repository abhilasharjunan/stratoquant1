import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

const mockUsePathname = vi.mocked(usePathname);

vi.mock('@/components/animations', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ScaleIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SlideIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import Navbar from './Navbar';

describe('Navbar', () => {
  it('returns null on home page', () => {
    mockUsePathname.mockReturnValue('/');
    const { container } = render(<Navbar />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null on auth pages', () => {
    mockUsePathname.mockReturnValue('/auth/signin');
    const { container } = render(<Navbar />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nav links on dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Navbar />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Portfolio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
  });

  it('renders all nav links', () => {
    mockUsePathname.mockReturnValue('/portfolio');
    render(<Navbar />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Portfolio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Risk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Compare').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Top Funds').length).toBeGreaterThan(0);
  });

  it('highlights active link', () => {
    mockUsePathname.mockReturnValue('/portfolio/risk');
    render(<Navbar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
