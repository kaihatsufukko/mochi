export class EventBus {
  constructor() { this._m = new Map(); }
  on(name, fn) {
    if (!this._m.has(name)) this._m.set(name, []);
    this._m.get(name).push(fn);
    return () => {
      const a = this._m.get(name);
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    };
  }
  emit(name, payload) {
    const a = this._m.get(name);
    if (!a) return;
    for (const fn of a.slice()) fn(payload);
  }
}
