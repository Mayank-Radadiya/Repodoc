import type { CSSProperties, FC } from 'react';

export interface GridDistortionProps {
  /**
   * Image to distort. It covers the container.
   */
  imageSrc: string;
  /**
   * Number of cells across. Rows follow the container so cells stay square.
   * Default: 15
   */
  grid?: number;
  /**
   * Reach of the pointer as a fraction of the container width.
   * Default: 0.18
   */
  radius?: number;
  /**
   * How far the pointer throws the cells. 0 turns the pointer off.
   * Default: 0.15
   */
  strength?: number;
  /**
   * How much displacement each cell keeps per frame. Higher values settle more slowly.
   * Default: 0.96
   */
  relaxation?: number;
  /**
   * Drag pulls cells along with the pointer, push throws them outward and swirl spins them around it.
   * Default: 'drag'
   */
  mode?: 'drag' | 'push' | 'swirl';
  /**
   * Blends the crisp blocks into a smooth liquid warp, from 0 to 1.
   * Default: 0
   */
  softness?: number;
  /**
   * Splits the color channels on displaced cells, from 0 to 1.
   * Default: 0
   */
  chroma?: number;
  /**
   * A slow wandering distortion that keeps the image alive while the pointer rests. 0 turns it off.
   * Default: 0.3
   */
  idle?: number;
  /**
   * Sends a ring of displaced cells out from every click.
   * Default: true
   */
  clickRipple?: boolean;
  /**
   * Scrambles the cells when the image loads and lets them settle into place.
   * Default: true
   */
  intro?: boolean;
  /**
   * Extra class names for the container.
   * Default: ''
   */
  className?: string;
  /**
   * Inline styles for the container.
   */
  style?: CSSProperties;
}

declare const GridDistortion: FC<GridDistortionProps>;

export default GridDistortion;
