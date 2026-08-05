// InputManager — Touch/mouse input abstraction
export class InputManager {
  private canvas: HTMLCanvasElement;
  private pointerDown = false;
  private targetX = 0;
  private listeners: Array<{ el: EventTarget; type: string; fn: EventListener }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private addListener(el: EventTarget, type: string, fn: EventListener) {
    el.addEventListener(type, fn);
    this.listeners.push({ el, type, fn });
  }

  private setupListeners() {
    const onPointerDown = (e: Event) => {
      const pe = e as PointerEvent;
      this.pointerDown = true;
      this.updatePointer(pe);
    };
    const onPointerMove = (e: Event) => {
      const pe = e as PointerEvent;
      if (this.pointerDown) {
        this.updatePointer(pe);
      }
    };
    const onPointerUp = () => {
      this.pointerDown = false;
    };

    this.addListener(this.canvas, 'pointerdown', onPointerDown);
    this.addListener(this.canvas, 'pointermove', onPointerMove);
    this.addListener(this.canvas, 'pointerup', onPointerUp);
    this.addListener(this.canvas, 'pointerleave', onPointerUp);
  }

  private updatePointer(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    this.targetX = ((px / rect.width) - 0.5) * 9;
  }

  isActive(): boolean {
    return this.pointerDown;
  }

  getTargetX(): number {
    return this.targetX;
  }

  dispose() {
    for (const { el, type, fn } of this.listeners) {
      el.removeEventListener(type, fn);
    }
    this.listeners = [];
  }
}
