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

  it('stops scheduling frames after image failure and retains a static fallback', () => {
    let frame: FrameRequestCallback | undefined;
    const images: { onerror: null | ((event: Event) => void) }[] = [];
    const gl = new Proxy({}, {
      get(_target, key) {
        if (typeof key === 'string' && key === key.toUpperCase()) return 1;
        if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
        if (key === 'getAttribLocation') return () => 0;
        if (String(key).startsWith('create') || key === 'getUniformLocation') return () => ({});
        return () => {};
      },
    });
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as WebGL2RenderingContext);
    vi.stubGlobal('Image', class {
      onload = null;
      onerror = null;
      constructor() { images.push(this); }
    });
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    const schedule = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; });
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', schedule);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    try {
      const { container, unmount } = render(<GridDistortion imageSrc="/landing/bg-hero.jpeg" idle={1} />);
      const failedImage = images[0];
      const scheduled = schedule.mock.calls.length;
      failedImage?.onerror?.(new Event('error'));
      frame?.(16);
      window.dispatchEvent(new Event('pointermove'));
      expect(schedule).toHaveBeenCalledTimes(scheduled);
      expect(cancel).toHaveBeenCalledWith(1);
      expect((container.firstElementChild as HTMLElement).style.backgroundImage).toContain('bg-hero.jpeg');
      expect((container.querySelector('canvas') as HTMLCanvasElement).style.opacity).toBe('0');
      unmount();
      expect(failedImage?.onerror).toBeNull();
    } finally { context.mockRestore(); }
  });
});
