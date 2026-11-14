import { vi } from "vitest";

/**
 * React Flow measures the DOM, which jsdom doesn't do. These stubs let the
 * canvas render in component tests (from the React Flow testing guide).
 */
export function stubReactFlowDom() {
  class ResizeObserverStub {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  class DOMMatrixReadOnlyStub {
    m22: number;
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
      this.m22 = scale !== undefined ? Number(scale) : 1;
    }
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("DOMMatrixReadOnly", DOMMatrixReadOnlyStub);
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { configurable: true, get() { return parseFloat(this.style.height) || 76; } },
    offsetWidth: { configurable: true, get() { return parseFloat(this.style.width) || 200; } },
  });
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
