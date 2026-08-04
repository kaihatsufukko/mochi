// gateMath.js — ゲート演算 純関数モジュール（three / DOM 非依存）
// 契約: docs/architecture.md §3
// Gate 状態は {op, value} のプレーンオブジェクト。value は常に正の整数（符号は op が持つ）。

const OPS = ['add', 'sub', 'mul', 'div'];

// growGate の上限（add/mul）。sub/div は下限 1。
const GROW_MAX = { add: 99, mul: 9 };

function assertOp(op) {
  if (!OPS.includes(op)) {
    throw new Error(`gateMath: invalid op '${op}' (expected add|sub|mul|div)`);
  }
}

function assertValue(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`gateMath: invalid value '${value}' (expected integer >= 1)`);
  }
}

/**
 * ゲートを生成する。
 * @param {'add'|'sub'|'mul'|'div'} op
 * @param {number} value 正の整数
 * @returns {{op: string, value: number}}
 * @throws value < 1 / 非整数 / 不正 op のとき Error
 */
export function createGate(op, value) {
  assertOp(op);
  assertValue(value);
  return { op, value };
}

/**
 * 部隊数 count がゲートを通過した後の部隊数を返す。
 * add: count + value / sub: max(0, count - value)
 * mul: count * value / div: ceil(count / value)
 * @param {number} count 現在の部隊数（0 以上の整数）
 * @param {{op: string, value: number}} gate
 * @returns {number} 整数、最小 0
 */
export function applyGate(count, gate) {
  assertOp(gate.op);
  assertValue(gate.value);
  switch (gate.op) {
    case 'add':
      return count + gate.value;
    case 'sub':
      return Math.max(0, count - gate.value);
    case 'mul':
      return count * gate.value;
    case 'div':
      return Math.ceil(count / gate.value);
  }
}

/**
 * 弾ヒット 1 発ぶんゲートを成長させる（1 ヒット = 1 ステップ）。
 * sub/div: value を 1 減らす（下限 1）。add: +1（上限 99）。mul: +1（上限 9）。
 * 元の gate は変更しない（イミュータブル）。
 * @param {{op: string, value: number}} gate
 * @returns {{op: string, value: number, changed: boolean}} 新オブジェクト
 */
export function growGate(gate) {
  assertOp(gate.op);
  assertValue(gate.value);
  let value = gate.value;
  if (gate.op === 'sub' || gate.op === 'div') {
    value = Math.max(1, value - 1);
  } else {
    value = Math.min(GROW_MAX[gate.op], value + 1);
  }
  return { op: gate.op, value, changed: value !== gate.value };
}

/**
 * ゲート表示文字列: '+5' '-4' 'x2' '÷3'（'x' は小文字エックス、'÷' は U+00F7）。
 * @param {{op: string, value: number}} gate
 * @returns {string}
 */
export function gateLabel(gate) {
  assertOp(gate.op);
  assertValue(gate.value);
  switch (gate.op) {
    case 'add':
      return `+${gate.value}`;
    case 'sub':
      return `-${gate.value}`;
    case 'mul':
      return `x${gate.value}`;
    case 'div':
      return `÷${gate.value}`;
  }
}

/**
 * 青（有利）ゲートか。add/mul なら true、sub/div なら false。
 * @param {{op: string}} gate
 * @returns {boolean}
 */
export function isPositiveGate(gate) {
  assertOp(gate.op);
  return gate.op === 'add' || gate.op === 'mul';
}
