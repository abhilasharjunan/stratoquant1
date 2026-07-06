import '@testing-library/react';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(() => Promise.resolve({ ok: true })),
  signOut: vi.fn(() => Promise.resolve({ ok: true })),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  getSession: vi.fn(),
}));
