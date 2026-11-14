import assert from "node:assert/strict";
import test from "node:test";

import { Order, SIDES } from "../../src/models/order.js";

function orderData(overrides = {}) {
  return {
    id: 1,
    side: SIDES.BUY,
    price: 1050,
    quantity: 100,
    sequence: 1,
    ...overrides,
  };
}

test("cria uma ordem de compra com a quantidade restante igual à pedida", () => {
  const order = new Order(orderData());

  assert.equal(order.id, 1);
  assert.equal(order.side, "buy");
  assert.equal(order.price, 1050);
  assert.equal(order.quantity, 100);
  assert.equal(order.remaining, 100);
  assert.equal(order.sequence, 1);
  assert.equal(order.isBuy, true);
  assert.equal(order.isFilled, false);
});

test("cria uma ordem de venda", () => {
  const order = new Order(orderData({ side: SIDES.SELL }));

  assert.equal(order.side, "sell");
  assert.equal(order.isBuy, false);
});

test("considera a ordem executada quando não resta quantidade", () => {
  const order = new Order(orderData());

  order.remaining = 0;

  assert.equal(order.isFilled, true);
});

test("rejeita lado desconhecido", () => {
  for (const side of ["BUY", "compra", "", undefined, null]) {
    assert.throws(() => new Order(orderData({ side })), TypeError);
  }
});

test("rejeita preço que não seja inteiro positivo em centavos", () => {
  assert.throws(() => new Order(orderData({ price: 10.5 })), TypeError);
  assert.throws(() => new Order(orderData({ price: "1050" })), TypeError);
  assert.throws(() => new Order(orderData({ price: Number.NaN })), TypeError);
  assert.throws(() => new Order(orderData({ price: 0 })), RangeError);
  assert.throws(() => new Order(orderData({ price: -1 })), RangeError);
});

test("rejeita quantidade que não seja inteira positiva", () => {
  assert.throws(() => new Order(orderData({ quantity: 1.5 })), TypeError);
  assert.throws(() => new Order(orderData({ quantity: undefined })), TypeError);
  assert.throws(() => new Order(orderData({ quantity: 0 })), RangeError);
  assert.throws(() => new Order(orderData({ quantity: -10 })), RangeError);
});

test("rejeita id e sequência inválidos", () => {
  assert.throws(() => new Order(orderData({ id: undefined })), TypeError);
  assert.throws(() => new Order(orderData({ id: 0 })), RangeError);
  assert.throws(() => new Order(orderData({ sequence: "1" })), TypeError);
  assert.throws(() => new Order(orderData({ sequence: 0 })), RangeError);
});
