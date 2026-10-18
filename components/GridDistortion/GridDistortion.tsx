'use client';

import React, { useEffect, useRef } from 'react';
import './GridDistortion.css';

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uField;
uniform vec2 uGrid;
uniform vec2 uCover;
uniform float uSoftness;
uniform float uChroma;
uniform float uReveal;
in vec2 vUv;
out vec4 outColor;

vec2 fieldAt(ivec2 cell) {
  return texelFetch(uField, clamp(cell, ivec2(0), ivec2(uGrid) - 1), 0).rg;
}

vec4 sampleImage(vec2 uv) {
  return texture(uImage, (uv - 0.5) * uCover + 0.5);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 g = uv * uGrid;
  vec2 blocky = fieldAt(ivec2(floor(g)));
  vec2 p = g - 0.5;
  ivec2 base = ivec2(floor(p));
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 soft = mix(
    mix(fieldAt(base), fieldAt(base + ivec2(1, 0)), f.x),
    mix(fieldAt(base + ivec2(0, 1)), fieldAt(base + ivec2(1, 1)), f.x),
    f.y
  );
  vec2 shift = mix(blocky, soft, uSoftness);
  float spread = uChroma * 0.35;
  vec4 cCenter = sampleImage(uv - shift);
  float r = sampleImage(uv - shift * (1.0 + spread)).r;
  float b = sampleImage(uv - shift * (1.0 - spread)).b;
  vec3 color = vec3(r, cCenter.g, b);
  float alpha = cCenter.a * uReveal;
  outColor = vec4(color * alpha, alpha);
}`;

export type DistortionMode = 'drag' | 'push' | 'swirl';
const MODES: readonly DistortionMode[] = ['drag', 'push', 'swirl'] as const;
const GAIN = 18;
const RIPPLE_LIFE = 1.6;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const hash = (x: number, y: number, z: number): number => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1;
};

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

export interface GridDistortionProps {
  /**
   * Image to distort. It covers the container.
   */
  imageSrc?: string;
  /**
   * Text to render and distort on a transparent canvas.
   */
  text?: string;
  /**
   * Called when texture is loaded and ready.
   */
  onReady?: () => void;
  /**
   * Number of cells across. Rows follow the container so cells stay square.
   * Default: 15
   */
  grid?: number;
  /**
   * Reach of the pointer as a fraction of the container width. Alias for `radius`.
   */
  mouse?: number;
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
  mode?: DistortionMode;
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
  style?: React.CSSProperties;
  /**
   * Optional error callback for fallback handling when loading textures or WebGL initialization fails.
   */
  onError?: (error: unknown) => void;
}

interface InternalSettings {
  grid: number;
  radius: number;
  strength: number;
  relaxation: number;
  mode: DistortionMode;
  softness: number;
  chroma: number;
  idle: number;
  clickRipple: boolean;
  intro: boolean;
}

interface Ripple {
  x: number;
  y: number;
  start: number;
}

interface DistortionState {
  width: number;
  height: number;
  cols: number;
  rows: number;
  sim: Float32Array;
  out: Float32Array;
  ripples: Ripple[];
  time: number;
  reveal: number;
  loaded: boolean;
  imageAspect: number;
  request: number;
  lastMove: number;
  phantom: number;
}

interface ControlMethods {
  load: (src?: string, textValue?: string) => void;
  wake: () => void;
}

export const GridDistortion: React.FC<GridDistortionProps> = ({
  imageSrc,
  text,
  onReady,
  grid = 15,
  mouse,
  radius = 0.18,
  strength = 0.15,
  relaxation = 0.96,
  mode = 'drag',
  softness = 0,
  chroma = 0,
  idle = 0.3,
  clickRipple = true,
  intro = true,
  className = '',
  style,
  onError,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlRef = useRef<ControlMethods | null>(null);

  const effectiveRadius = radius ?? mouse ?? 0.18;
  const settings: InternalSettings = {
    grid: clamp(Math.round(grid), 2, 120),
    radius: clamp(effectiveRadius, 0.01, 1),
    strength: Math.max(0, strength),
    relaxation: clamp(relaxation, 0, 0.995),
    mode: mode && MODES.includes(mode) ? mode : 'drag',
    softness: clamp(softness, 0, 1),
    chroma: clamp(chroma, 0, 2),
    idle: clamp(idle, 0, 1),
    clickRipple,
    intro,
  };

  const settingsRef = useRef<InternalSettings>(settings);
  const onReadyRef = useRef<(() => void) | undefined>(onReady);
  const onErrorRef = useRef<((error: unknown) => void) | undefined>(onError);
  const textRef = useRef<string | undefined>(text);

  useEffect(() => {
    settingsRef.current = settings;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    textRef.current = text;
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) {
      onErrorRef.current?.(new Error('WebGL2 is not supported in this environment.'));
      return undefined;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      onErrorRef.current?.(new Error('Failed to create or compile WebGL shaders.'));
      return undefined;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      onErrorRef.current?.(new Error('Failed to link WebGL program.'));
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      onErrorRef.current?.(new Error('Failed to create WebGL buffer.'));
      return undefined;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'aPosition');
    if (position !== -1) {
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    }

    const uniforms = {
      uImage: gl.getUniformLocation(program, 'uImage'),
      uField: gl.getUniformLocation(program, 'uField'),
      uGrid: gl.getUniformLocation(program, 'uGrid'),
      uCover: gl.getUniformLocation(program, 'uCover'),
      uSoftness: gl.getUniformLocation(program, 'uSoftness'),
      uChroma: gl.getUniformLocation(program, 'uChroma'),
      uReveal: gl.getUniformLocation(program, 'uReveal'),
    };
    gl.uniform1i(uniforms.uImage, 0);
    gl.uniform1i(uniforms.uField, 1);

    const imageTexture = gl.createTexture();
    const fieldTexture = gl.createTexture();
    if (!imageTexture || !fieldTexture) {
      if (imageTexture) gl.deleteTexture(imageTexture);
      if (fieldTexture) gl.deleteTexture(fieldTexture);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      onErrorRef.current?.(new Error('Failed to create WebGL textures.'));
      return undefined;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const reduce =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const pointer = { x: 0, y: 0, px: 0, py: 0, inside: false };
    const state: DistortionState = {
      width: 1,
      height: 1,
      cols: 0,
      rows: 0,
      sim: new Float32Array(0),
      out: new Float32Array(0),
      ripples: [],
      time: 0,
      reveal: 0,
      loaded: false,
      imageAspect: 1,
      request: 0,
      lastMove: -10,
      phantom: 1,
    };
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;

    const layout = () => {
      const cols = settingsRef.current.grid;
      const rows = Math.max(1, Math.round((cols * state.height) / state.width));
      if (cols === state.cols && rows === state.rows) return;
      state.cols = cols;
      state.rows = rows;
      state.sim = new Float32Array(cols * rows * 2);
      state.out = new Float32Array(cols * rows * 2);
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RG32F,
        cols,
        rows,
        0,
        gl.RG,
        gl.FLOAT,
        state.out,
      );
    };

    const scramble = () => {
      const { sim, cols, rows, width, height } = state;
      const reach = Math.min(width, height) * 0.12;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 2;
          sim[i] = (hash(col + 1, row + 1, 11) * reach) / width;
          sim[i + 1] = (hash(col + 1, row + 1, 23) * reach) / height;
        }
      }
    };

    const brush = (
      s: InternalSettings,
      x: number,
      y: number,
      dx: number,
      dy: number,
      weight: number,
    ) => {
      const { sim, cols, rows, width, height } = state;
      const reach = Math.max(1, s.radius * width);
      const cellWidth = width / cols;
      const cellHeight = height / rows;
      const speed = Math.hypot(dx, dy);
      const limit = (0.25 + s.strength) * 0.4 * width;
      const fromCol = Math.max(0, Math.floor((x - reach) / cellWidth));
      const toCol = Math.min(cols - 1, Math.floor((x + reach) / cellWidth));
      const fromRow = Math.max(0, Math.floor((y - reach) / cellHeight));
      const toRow = Math.min(rows - 1, Math.floor((y + reach) / cellHeight));
      for (let row = fromRow; row <= toRow; row++) {
        for (let col = fromCol; col <= toCol; col++) {
          const ox = (col + 0.5) * cellWidth - x;
          const oy = (row + 0.5) * cellHeight - y;
          const distance = Math.hypot(ox, oy);
          if (distance >= reach) continue;
          const t = 1 - (distance / reach) ** 2;
          const k = s.strength * GAIN * weight * t * t;
          let vx = dx;
          let vy = dy;
          if (s.mode !== 'drag') {
            const nx = distance > 0 ? ox / distance : 0;
            const ny = distance > 0 ? oy / distance : 0;
            vx = s.mode === 'push' ? nx * speed : -ny * speed;
            vy = s.mode === 'push' ? ny * speed : nx * speed;
          }
          const i = (row * cols + col) * 2;
          const px = sim[i] * width + vx * k;
          const py = sim[i + 1] * height + vy * k;
          const length = Math.hypot(px, py);
          const scale =
            length > 0 ? (limit * Math.tanh(length / limit)) / length : 0;
          sim[i] = (px * scale) / width;
          sim[i + 1] = (py * scale) / height;
        }
      }
    };

    const wander = (t: number): [number, number] => [
      state.width *
        (0.5 + 0.34 * Math.sin(t * 0.43) + 0.08 * Math.sin(t * 1.21 + 1.7)),
      state.height *
        (0.5 + 0.3 * Math.sin(t * 0.61 + 0.9) + 0.08 * Math.cos(t * 1.03 + 0.4)),
    ];

    const simulate = (s: InternalSettings, dt: number): number => {
      const { sim } = state;
      const decay = Math.pow(s.relaxation, dt * 60);
      let peak = 0;
      for (let i = 0; i < sim.length; i++) {
        sim[i] *= decay;
        if (Math.abs(sim[i]) < 1e-5) sim[i] = 0;
        else peak = Math.max(peak, Math.abs(sim[i]));
      }
      if (s.strength <= 0) return peak;

      const dx = pointer.x - pointer.px;
      const dy = pointer.y - pointer.py;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      if (pointer.inside && (dx || dy)) {
        state.lastMove = state.time;
        brush(s, pointer.x, pointer.y, dx, dy, 1);
        peak = Math.max(peak, 1e-3);
      }

      const drift = reduce ? 0 : s.idle;
      const resting = state.time - state.lastMove > 2.5;
      state.phantom = clamp(state.phantom + (resting ? dt : -dt * 3), 0, 1);
      if (drift > 0 && state.phantom > 0) {
        const [x, y] = wander(state.time);
        const [px, py] = wander(state.time - dt);
        brush(s, x, y, x - px, y - py, drift * 0.6 * state.phantom * state.phantom);
      }
      return peak;
    };

    const compose = (s: InternalSettings) => {
      const { sim, out, cols, rows, width, height, time } = state;
      out.set(sim);
      if (state.ripples.length) {
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const span = Math.hypot(width, height);
        const band = Math.max(cellWidth, cellHeight) * 1.2 + span * 0.03;
        const amount = width * (0.03 + s.strength * 0.3);
        state.ripples = state.ripples.filter(
          (ripple) => time - ripple.start < RIPPLE_LIFE,
        );
        for (const ripple of state.ripples) {
          const age = (time - ripple.start) / RIPPLE_LIFE;
          const front = age * span * 0.75;
          const fade = (1 - age) ** 2;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const ox = (col + 0.5) * cellWidth - ripple.x;
              const oy = (row + 0.5) * cellHeight - ripple.y;
              const distance = Math.hypot(ox, oy);
              const wave = Math.exp(-(((distance - front) / band) ** 2)) * fade;
              if (wave < 0.002 || distance === 0) continue;
              const i = (row * cols + col) * 2;
              out[i] += (ox / distance) * ((wave * amount) / width);
              out[i + 1] += (oy / distance) * ((wave * amount) / height);
            }
          }
        }
      }
    };

    const render = () => {
      const { width, height } = state;
      const aspect = width / height;
      const cover: [number, number] =
        aspect > state.imageAspect
          ? [1, state.imageAspect / aspect]
          : [aspect / state.imageAspect, 1];
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE1);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        state.cols,
        state.rows,
        gl.RG,
        gl.FLOAT,
        state.out,
      );
      const s = settingsRef.current;
      gl.uniform2f(uniforms.uGrid, state.cols, state.rows);
      gl.uniform2f(uniforms.uCover, cover[0], cover[1]);
      gl.uniform1f(uniforms.uSoftness, s.softness);
      gl.uniform1f(uniforms.uChroma, s.chroma);
      gl.uniform1f(uniforms.uReveal, state.reveal);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!alive || !visible) return;
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      state.time += dt;
      layout();
      if (state.loaded) {
        state.reveal = reduce ? 1 : Math.min(1, state.reveal + dt / 0.6);
      }
      const peak = simulate(s, dt);
      compose(s);
      render();
      const busy =
        peak > 0 ||
        state.ripples.length > 0 ||
        (s.idle > 0 && !reduce) ||
        state.reveal < 1;
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (raf || !alive || !visible) return;
      raf = requestAnimationFrame(frame);
    };

    const offscreenCanvas =
      typeof document !== 'undefined' ? document.createElement('canvas') : null;

    const renderText = (targetCanvas: HTMLCanvasElement, textContent: string) => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;
      const w = targetCanvas.width;
      const h = targetCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = w / dpr;
      let fontSizeCss = 32;
      if (cssWidth >= 1024) {
        fontSizeCss = 68;
      } else if (cssWidth >= 640) {
        fontSizeCss = 48;
      }
      const fontSize = fontSizeCss * dpr;
      const lineHeight = fontSize * 1.15;

      ctx.font = `400 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(3, 17, 48, 0.75)';
      ctx.shadowBlur = 16 * dpr;
      ctx.shadowOffsetY = 3 * dpr;

      const words = textContent.trim().split(/\s+/);
      const lines: string[] = [];
      let currentLine = words[0] ?? '';
      const maxLineWidth = w * 0.96;

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        if (ctx.measureText(testLine).width <= maxLineWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = words[i] ?? '';
        }
      }
      lines.push(currentLine);

      const totalHeight = lines.length * lineHeight;
      const startY = Math.max(0, (h - totalHeight) / 2);

      lines.forEach((line, idx) => {
        ctx.fillText(line, w / 2, startY + idx * lineHeight);
      });
    };

    const updateTextTexture = () => {
      if (!alive || !offscreenCanvas || !canvas) return;
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      renderText(offscreenCanvas, textRef.current ?? '');
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        offscreenCanvas,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      state.imageAspect = canvas.width / Math.max(1, canvas.height);
      layout();
      if (settingsRef.current.intro && !reduce) scramble();
      state.loaded = true;
      onReadyRef.current?.();
      wake();
    };

    const load = (src?: string, textValue?: string) => {
      if (textValue) {
        updateTextTexture();
        if (typeof document !== 'undefined' && 'fonts' in document) {
          document.fonts.ready.then(() => {
            if (alive) updateTextTexture();
          });
        }
        return;
      }
      const request = ++state.request;
      if (!src) return;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => {
        if (!alive || request !== state.request) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
        state.imageAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
        layout();
        if (settingsRef.current.intro && !reduce) scramble();
        state.loaded = true;
        onReadyRef.current?.();
        wake();
      };
      image.onerror = (err) => {
        if (!alive || request !== state.request) return;
        onErrorRef.current?.(err);
      };
      image.src = src;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (inside && !pointer.inside) {
        pointer.px = x;
        pointer.py = y;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside) wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current.clickRipple || reduce) return;
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      state.ripples.push({ x, y, start: state.time });
      if (state.ripples.length > 4) state.ripples.shift();
      wake();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = Math.max(1, root.clientWidth);
      state.height = Math.max(1, root.clientHeight);
      canvas.width = Math.round(state.width * dpr);
      canvas.height = Math.round(state.height * dpr);
      if (textRef.current && state.loaded && offscreenCanvas) {
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        renderText(offscreenCanvas, textRef.current);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          offscreenCanvas,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        state.imageAspect = canvas.width / Math.max(1, canvas.height);
      }
      layout();
      if (!raf) {
        compose(settingsRef.current);
        render();
      }
      wake();
    };

    controlRef.current = { load, wake };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    visibility.observe(root);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      controlRef.current = null;
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      gl.deleteTexture(imageTexture);
      gl.deleteTexture(fieldTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  useEffect(() => {
    controlRef.current?.load(imageSrc, text);
  }, [imageSrc, text]);

  useEffect(() => {
    controlRef.current?.wake();
  });

  return (
    <div
      ref={rootRef}
      className={`distortion-container${className ? ` ${className}` : ''}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="distortion-container__canvas"
        aria-hidden="true"
      />
    </div>
  );
};

export default GridDistortion;
