import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import GridDistortion, { GridDistortion as NamedGridDistortion } from '../index';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('GridDistortion component', () => {
  it('exports both default and named component', () => {
    expect(GridDistortion).toBeDefined();
    expect(NamedGridDistortion).toBeDefined();
    expect(GridDistortion).toBe(NamedGridDistortion);
  });

  it('renders distortion container and canvas element', () => {
    const { container } = render(
      <GridDistortion imageSrc="/landing/bg-hero.jpeg" className="custom-test-class" />
    );

    const root = container.querySelector('.distortion-container');
    expect(root).toBeDefined();
    expect(root?.classList.contains('custom-test-class')).toBe(true);

    const canvas = container.querySelector('canvas.distortion-container__canvas');
    expect(canvas).toBeDefined();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('safely invokes onError fallback when WebGL2 is not supported', () => {
    const onError = vi.fn();
    render(
      <GridDistortion
        imageSrc="/landing/bg-hero.jpeg"
        grid={20}
        radius={0.2}
        strength={0.15}
        relaxation={0.95}
        onError={onError}
      />
    );

    // In JSDOM, HTMLCanvasElement.getContext('webgl2') returns null by default
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/webgl2 is not supported/i),
      })
    );
  });

  it('supports text rendering mode props without throwing', () => {
    const onError = vi.fn();
    const { container } = render(
      <GridDistortion text="Test Distortion Text" onError={onError} />
    );

    const root = container.querySelector('.distortion-container');
    expect(root).toBeDefined();
  });
});
