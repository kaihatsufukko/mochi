// gateMath.test.js — docs/architecture.md §3 の契約を固定する単体テスト
import { describe, it, expect } from 'vitest';
import {
  createGate,
  applyGate,
  growGate,
  gateLabel,
  isPositiveGate,
} from './gateMath.js';

describe('createGate', () => {
  it('creates a plain {op, value} object', () => {
    expect(createGate('add', 5)).toEqual({ op: 'add', value: 5 });
    expect(createGate('div', 3)).toEqual({ op: 'div', value: 3 });
  });

  it('throws on value = 0', () => {
    expect(() => createGate('add', 0)).toThrow();
  });

  it('throws on value = -1', () => {
    expect(() => createGate('sub', -1)).toThrow();
  });

  it('throws on non-integer value 1.5', () => {
    expect(() => createGate('mul', 1.5)).toThrow();
  });

  it("throws on non-numeric value 'x'", () => {
    expect(() => createGate('add', 'x')).toThrow();
  });

  it('throws on invalid op', () => {
    expect(() => createGate('pow', 2)).toThrow();
    expect(() => createGate(undefined, 2)).toThrow();
  });
});

describe('applyGate — 正常系', () => {
  it('add: count + value', () => {
    expect(applyGate(10, { op: 'add', value: 5 })).toBe(15);
  });

  it('sub: count - value', () => {
    expect(applyGate(10, { op: 'sub', value: 4 })).toBe(6);
  });

  it('sub: floors at 0 (max(0, n - v))', () => {
    expect(applyGate(3, { op: 'sub', value: 7 })).toBe(0);
  });

  it('mul: count * value', () => {
    expect(applyGate(6, { op: 'mul', value: 3 })).toBe(18);
  });

  it('div: ceil(5 / 2) === 3', () => {
    expect(applyGate(5, { op: 'div', value: 2 })).toBe(3);
  });

  it('div: ceil(7 / 3) === 3', () => {
    expect(applyGate(7, { op: 'div', value: 3 })).toBe(3);
  });

  it('div: exact division has no rounding (8 / 2 === 4)', () => {
    expect(applyGate(8, { op: 'div', value: 2 })).toBe(4);
  });
});

describe('applyGate — count = 0 / 1 境界', () => {
  it('count = 0: add still adds (0 + 5 = 5)', () => {
    expect(applyGate(0, { op: 'add', value: 5 })).toBe(5);
  });

  it('count = 0: sub stays 0', () => {
    expect(applyGate(0, { op: 'sub', value: 3 })).toBe(0);
  });

  it('count = 0: mul stays 0', () => {
    expect(applyGate(0, { op: 'mul', value: 4 })).toBe(0);
  });

  it('count = 0: div stays 0', () => {
    expect(applyGate(0, { op: 'div', value: 3 })).toBe(0);
  });

  it('count = 1: each op', () => {
    expect(applyGate(1, { op: 'add', value: 1 })).toBe(2);
    expect(applyGate(1, { op: 'sub', value: 1 })).toBe(0);
    expect(applyGate(1, { op: 'mul', value: 2 })).toBe(2);
    expect(applyGate(1, { op: 'div', value: 5 })).toBe(1); // ceil(1/5) = 1
  });

  it('result is always a non-negative integer', () => {
    const gates = [
      { op: 'add', value: 7 },
      { op: 'sub', value: 13 },
      { op: 'mul', value: 3 },
      { op: 'div', value: 7 },
    ];
    for (const count of [0, 1, 2, 5, 13, 99, 200]) {
      for (const gate of gates) {
        const r = applyGate(count, gate);
        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('growGate — 1ヒット1ステップ', () => {
  it('sub: value decreases by 1, changed:true', () => {
    expect(growGate({ op: 'sub', value: 4 })).toEqual({ op: 'sub', value: 3, changed: true });
  });

  it('sub: at lower bound value=1 → changed:false', () => {
    expect(growGate({ op: 'sub', value: 1 })).toEqual({ op: 'sub', value: 1, changed: false });
  });

  it('div: value decreases by 1, changed:true', () => {
    expect(growGate({ op: 'div', value: 3 })).toEqual({ op: 'div', value: 2, changed: true });
  });

  it('div: at lower bound value=1 → changed:false', () => {
    expect(growGate({ op: 'div', value: 1 })).toEqual({ op: 'div', value: 1, changed: false });
  });

  it('add: value increases by 1, changed:true', () => {
    expect(growGate({ op: 'add', value: 5 })).toEqual({ op: 'add', value: 6, changed: true });
  });

  it('add: at upper bound value=99 → changed:false', () => {
    expect(growGate({ op: 'add', value: 99 })).toEqual({ op: 'add', value: 99, changed: false });
  });

  it('add: 98 → 99 is still changed:true', () => {
    expect(growGate({ op: 'add', value: 98 })).toEqual({ op: 'add', value: 99, changed: true });
  });

  it('mul: value increases by 1, changed:true', () => {
    expect(growGate({ op: 'mul', value: 2 })).toEqual({ op: 'mul', value: 3, changed: true });
  });

  it('mul: at upper bound value=9 → changed:false', () => {
    expect(growGate({ op: 'mul', value: 9 })).toEqual({ op: 'mul', value: 9, changed: false });
  });

  it('mul: 8 → 9 is still changed:true', () => {
    expect(growGate({ op: 'mul', value: 8 })).toEqual({ op: 'mul', value: 9, changed: true });
  });

  it('does not mutate the original gate object (immutable)', () => {
    const gate = createGate('sub', 4);
    const frozen = Object.freeze({ ...gate });
    const grown = growGate(gate);
    expect(gate).toEqual(frozen); // unchanged
    expect(grown).not.toBe(gate); // new object
    // hitting the bound also returns a new object, never the input
    const atBound = createGate('div', 1);
    const grownAtBound = growGate(atBound);
    expect(grownAtBound).not.toBe(atBound);
    expect(atBound).toEqual({ op: 'div', value: 1 });
  });

  it('統合例: value=4 の sub ゲートに growGate を3回 → value=1（表示 -1）', () => {
    let gate = createGate('sub', 4);
    for (let hit = 0; hit < 3; hit++) {
      gate = growGate(gate);
    }
    expect(gate.value).toBe(1);
    expect(gate.changed).toBe(true); // 3回目 (2→1) も変化あり
    expect(gateLabel(gate)).toBe('-1');
    // 4発目は下限で止まる
    expect(growGate(gate)).toEqual({ op: 'sub', value: 1, changed: false });
  });
});

describe('gateLabel', () => {
  it("add → '+5'", () => {
    expect(gateLabel({ op: 'add', value: 5 })).toBe('+5');
  });

  it("sub → '-4'", () => {
    expect(gateLabel({ op: 'sub', value: 4 })).toBe('-4');
  });

  it("mul → 'x2' (lowercase x)", () => {
    expect(gateLabel({ op: 'mul', value: 2 })).toBe('x2');
  });

  it("div → '÷3' (U+00F7)", () => {
    const label = gateLabel({ op: 'div', value: 3 });
    expect(label).toBe('÷3');
    expect(label.charCodeAt(0)).toBe(0xf7);
  });
});

describe('isPositiveGate', () => {
  it('add / mul → true (blue)', () => {
    expect(isPositiveGate({ op: 'add', value: 5 })).toBe(true);
    expect(isPositiveGate({ op: 'mul', value: 2 })).toBe(true);
  });

  it('sub / div → false (red)', () => {
    expect(isPositiveGate({ op: 'sub', value: 4 })).toBe(false);
    expect(isPositiveGate({ op: 'div', value: 3 })).toBe(false);
  });
});
