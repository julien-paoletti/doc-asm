import rough from 'roughjs/bin/rough.js';
import type { RoughSVG } from 'roughjs/bin/svg.js';
import { generateId } from '../../utils/id.js';

// ── Shape types ────────────────────────────────────────────────────────────

export type ShapeKind = 'circle' | 'arrow';

export interface CircleShape {
  kind: 'circle';
  id: string;
  color: string;
  seed: number;
  cx: number; cy: number; // center, as fraction of image size (0–1)
  r: number;              // radius, as fraction of image width (0–1)
}

export interface ArrowShape {
  kind: 'arrow';
  id: string;
  color: string;
  seed: number;
  x1: number; y1: number; // start, fraction
  x2: number; y2: number; // end, fraction
}

export type Shape = CircleShape | ArrowShape;

// ── Color palette ──────────────────────────────────────────────────────────

export const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#1e293b'];

// ── Rough options ──────────────────────────────────────────────────────────

function roughOpts(color: string, seed: number) {
  return { stroke: color, strokeWidth: 2.5, roughness: 1.4, bowing: 1, seed } as const;
}

// ── Arrow geometry ─────────────────────────────────────────────────────────

function arrowHead(
  x1: number, y1: number, x2: number, y2: number, size: number,
): [number, number, number, number, number, number] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 6;
  return [
    x2 - size * Math.cos(angle - spread), y2 - size * Math.sin(angle - spread),
    x2, y2,
    x2 - size * Math.cos(angle + spread), y2 - size * Math.sin(angle + spread),
  ];
}

// ── Draw helpers ──────────────────────────────────────────────────────────

function drawShape(rc: RoughSVG, shape: Shape, w: number, h: number): SVGGElement {
  const opts = roughOpts(shape.color, shape.seed);
  if (shape.kind === 'circle') {
    return rc.ellipse(shape.cx * w, shape.cy * h, shape.r * w * 2, shape.r * w * 2, opts);
  }
  const x1 = shape.x1 * w, y1 = shape.y1 * h, x2 = shape.x2 * w, y2 = shape.y2 * h;
  const headSize = Math.min(20, Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 0.3);
  const [ax1, ay1, , , ax2, ay2] = arrowHead(x1, y1, x2, y2, headSize);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.appendChild(rc.line(x1, y1, x2, y2, opts));
  g.appendChild(rc.line(x2, y2, ax1, ay1, opts));
  g.appendChild(rc.line(x2, y2, ax2, ay2, opts));
  return g;
}

// ── Annotation layer ───────────────────────────────────────────────────────

export type Tool = 'select' | 'circle' | 'arrow';

export interface AnnotationLayerOptions {
  shapes: Shape[];
  onChange(shapes: Shape[]): void;
}

export class AnnotationLayer {
  readonly el: SVGSVGElement;
  private rc: RoughSVG;
  private shapes: Shape[];
  private onChange: (shapes: Shape[]) => void;

  private tool: Tool = 'select';
  private color: string = COLORS[0] ?? '#ef4444';
  private selectedId: string | null = null;

  private drawing = false;
  private drawStart: { x: number; y: number } | null = null;
  private drawPreview: SVGGElement | null = null;

  private dragging = false;
  private dragShape: Shape | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(opts: AnnotationLayerOptions) {
    this.shapes = opts.shapes.map((s) => ({ ...s }));
    this.onChange = opts.onChange;

    this.el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.el.setAttribute('class', 'annot-layer');
    this.el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;cursor:crosshair';
    this.el.setAttribute('tabindex', '0');

    this.rc = rough.svg(this.el);
    this.bindEvents();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.el.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    if (tool !== 'select') this.select(null);
  }

  setColor(color: string): void {
    this.color = color;
    if (this.selectedId) {
      this.shapes = this.shapes.map((s) => s.id === this.selectedId ? { ...s, color } : s);
      this.redraw();
      this.onChange(this.shapes);
    }
  }

  deleteSelected(): boolean {
    if (!this.selectedId) return false;
    this.shapes = this.shapes.filter((s) => s.id !== this.selectedId);
    this.selectedId = null;
    this.redraw();
    this.onChange(this.shapes);
    return true;
  }

  updateShapes(shapes: Shape[]): void {
    this.shapes = shapes.map((s) => ({ ...s }));
    this.redraw();
  }

  destroy(): void {
    this.el.replaceWith(this.el.cloneNode(false) as SVGSVGElement);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private svgPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  private select(id: string | null): void {
    this.selectedId = id;
    this.redraw();
  }

  private hitTest(pt: { x: number; y: number }, w: number, h: number): Shape | null {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      if (!s) continue;
      if (s.kind === 'circle') {
        const dx = (pt.x - s.cx) * w, dy = (pt.y - s.cy) * h;
        if (Math.sqrt(dx * dx + dy * dy) <= s.r * w + 8) return s;
      } else {
        const x1 = s.x1 * w, y1 = s.y1 * h, x2 = s.x2 * w, y2 = s.y2 * h;
        const px = pt.x * w, py = pt.y * h;
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        if (Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2) <= 10) return s;
      }
    }
    return null;
  }

  private bindEvents(): void {
    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.el.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.el.addEventListener('pointercancel', () => this.cancelInteraction());
    this.el.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) this.deleteSelected();
    });
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    const pt = this.svgPoint(e);
    const rect = this.el.getBoundingClientRect();

    if (this.tool === 'select') {
      const hit = this.hitTest(pt, rect.width, rect.height);
      if (hit) {
        this.select(hit.id);
        this.dragging = true;
        this.dragShape = hit;
        this.dragOffset = hit.kind === 'circle'
          ? { x: pt.x - hit.cx, y: pt.y - hit.cy }
          : { x: pt.x - hit.x1, y: pt.y - hit.y1 };
      } else {
        this.select(null);
      }
    } else {
      this.drawing = true;
      this.drawStart = pt;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawing && !this.dragging) return;
    const pt = this.svgPoint(e);

    if (this.dragging && this.dragShape) {
      this.shapes = this.shapes.map((s) => {
        if (s.id !== this.dragShape!.id) return s;
        if (s.kind === 'circle') {
          return { ...s, cx: pt.x - this.dragOffset.x, cy: pt.y - this.dragOffset.y };
        }
        const dx = pt.x - this.dragOffset.x - s.x1, dy = pt.y - this.dragOffset.y - s.y1;
        return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
      });
      this.redraw();
      return;
    }

    if (this.drawing && this.drawStart) this.drawPreviewShape(this.drawStart, pt);
  }

  private onPointerUp(e: PointerEvent): void {
    const pt = this.svgPoint(e);

    if (this.dragging) {
      this.dragging = false;
      this.dragShape = null;
      this.onChange(this.shapes);
      return;
    }

    if (this.drawing && this.drawStart) {
      this.drawing = false;
      this.removePreview();

      const dx = pt.x - this.drawStart.x, dy = pt.y - this.drawStart.y;
      const rect = this.el.getBoundingClientRect();
      if (Math.sqrt((dx * rect.width) ** 2 + (dy * rect.height) ** 2) < 6) {
        this.drawStart = null;
        return;
      }

      const seed = Math.floor(Math.random() * 100000);
      let shape: Shape;

      if (this.tool === 'circle') {
        const cx = (this.drawStart.x + pt.x) / 2, cy = (this.drawStart.y + pt.y) / 2;
        const r = Math.sqrt(dx * dx + (dy * rect.height / rect.width) ** 2) / 2;
        shape = { kind: 'circle', id: generateId(), color: this.color, seed, cx, cy, r };
      } else {
        shape = { kind: 'arrow', id: generateId(), color: this.color, seed, x1: this.drawStart.x, y1: this.drawStart.y, x2: pt.x, y2: pt.y };
      }

      this.shapes = [...this.shapes, shape];
      this.drawStart = null;
      this.select(shape.id);
      this.onChange(this.shapes);
    }
  }

  private cancelInteraction(): void {
    this.drawing = false;
    this.dragging = false;
    this.dragShape = null;
    this.removePreview();
  }

  private removePreview(): void {
    this.drawPreview?.remove();
    this.drawPreview = null;
  }

  private drawPreviewShape(start: { x: number; y: number }, end: { x: number; y: number }): void {
    this.removePreview();
    const rect = this.el.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const opts = { ...roughOpts(this.color, 1), roughness: 0 };

    if (this.tool === 'circle') {
      const cx = ((start.x + end.x) / 2) * w, cy = ((start.y + end.y) / 2) * h;
      const dx = (end.x - start.x) * w, dy = (end.y - start.y) * h;
      this.drawPreview = this.rc.ellipse(cx, cy, Math.sqrt(dx * dx + dy * dy), Math.sqrt(dx * dx + dy * dy), opts);
    } else {
      const x1 = start.x * w, y1 = start.y * h, x2 = end.x * w, y2 = end.y * h;
      const headSize = Math.min(20, Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 0.3);
      const [ax1, ay1, , , ax2, ay2] = arrowHead(x1, y1, x2, y2, headSize);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.appendChild(this.rc.line(x1, y1, x2, y2, opts));
      g.appendChild(this.rc.line(x2, y2, ax1, ay1, opts));
      g.appendChild(this.rc.line(x2, y2, ax2, ay2, opts));
      this.drawPreview = g;
    }

    this.drawPreview.style.opacity = '0.6';
    this.el.appendChild(this.drawPreview);
  }

  redraw(): void {
    Array.from(this.el.querySelectorAll('[data-shape]')).forEach((el) => el.remove());
    this.drawPreview?.remove();

    const rect = this.el.getBoundingClientRect();
    const w = rect.width || 1, h = rect.height || 1;

    for (const shape of this.shapes) {
      const g = drawShape(this.rc, shape, w, h);
      g.setAttribute('data-shape', shape.id);
      g.style.cursor = this.tool === 'select' ? 'move' : 'crosshair';

      if (shape.id === this.selectedId) {
        const outline = g.cloneNode(true) as SVGGElement;
        Array.from(outline.querySelectorAll('path')).forEach((p) => {
          p.setAttribute('stroke', 'rgba(255,255,255,0.6)');
          p.setAttribute('stroke-width', '5');
        });
        outline.setAttribute('data-shape', '');
        this.el.appendChild(outline);
      }

      this.el.appendChild(g);
    }

    if (this.drawPreview) this.el.appendChild(this.drawPreview);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  static exportSvgString(shapes: Shape[], width: number): string {
    const h = width;
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tmp.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    tmp.setAttribute('viewBox', `0 0 ${width} ${h}`);
    tmp.setAttribute('preserveAspectRatio', 'none');
    tmp.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
    const rc = rough.svg(tmp);
    for (const shape of shapes) tmp.appendChild(drawShape(rc, shape, width, h));
    return tmp.outerHTML;
  }
}
