import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn, ScaleIn, SlideIn } from './animations';

describe('FadeIn', () => {
  it('renders children', () => {
    const { container } = render(<FadeIn><div data-testid="child">Hello</div></FadeIn>);
    expect(container.querySelector('[data-testid="child"]')).toBeDefined();
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('accepts custom delay and duration', () => {
    const { container } = render(<FadeIn delay={0.3} duration={1}>Content</FadeIn>);
    expect(container.textContent).toBe('Content');
  });

  it('renders without crashing with default props', () => {
    expect(() => render(<FadeIn>Test</FadeIn>)).not.toThrow();
  });
});

describe('ScaleIn', () => {
  it('renders children', () => {
    const { container } = render(<ScaleIn><span data-testid="child">Scaled</span></ScaleIn>);
    expect(container.querySelector('[data-testid="child"]')).toBeDefined();
  });

  it('renders without crashing', () => {
    expect(() => render(<ScaleIn>Content</ScaleIn>)).not.toThrow();
  });
});

describe('SlideIn', () => {
  it('renders children', () => {
    const { container } = render(<SlideIn><p data-testid="child">Slid</p></SlideIn>);
    expect(container.querySelector('[data-testid="child"]')).toBeDefined();
  });

  it('accepts left direction', () => {
    const { container } = render(<SlideIn direction="left">Left</SlideIn>);
    expect(container.textContent).toBe('Left');
  });

  it('renders without crashing', () => {
    expect(() => render(<SlideIn>Content</SlideIn>)).not.toThrow();
  });
});
