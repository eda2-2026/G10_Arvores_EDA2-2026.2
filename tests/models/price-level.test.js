import assert from "node:assert/strict";
import test from "node:test";

import { Order, SIDES } from "../../src/models/order.js";
import { PriceLevel } from "../../src/models/price-level.js";

let nextId = 1;

function buyOrder(quantity, price = 1050) {
  const id = nextId;
  nextId += 1;

  return new Order({ id, side: SIDES.BUY, price, quantity, sequence: id });
}

test("cria um nível de preço vazio", () => {
  const level = new PriceLevel(1050);

  assert.equal(level.price, 1050);
  assert.equal(level.isEmpty, true);
  assert.equal(level.orderCount, 0);
  assert.equal(level.totalQuantity, 0);
  assert.equal(level.peek(), null);
  assert.deepEqual(level.orders(), []);
});

test("mantém as ordens do mesmo preço na ordem de chegada", () => {
  const level = new PriceLevel(1050);
  const first = buyOrder(100);
  const second = buyOrder(50);
  const third = buyOrder(25);

  level.add(first);
  level.add(second);
  level.add(third);

  assert.equal(level.orderCount, 3);
  assert.equal(level.peek(), first);
  assert.deepEqual(level.orders(), [first, second, third]);
});

test("soma a quantidade restante de todas as ordens do nível", () => {
  const level = new PriceLevel(1050);
  const first = buyOrder(100);

  level.add(first);
  level.add(buyOrder(50));

  assert.equal(level.totalQuantity, 150);

  first.remaining = 40;

  assert.equal(level.totalQuantity, 90);
});

test("remove uma ordem pelo nó devolvido ao adicionar", () => {
  const level = new PriceLevel(1050);
  const first = buyOrder(100);
  const second = buyOrder(50);
  const firstNode = level.add(first);
  level.add(second);

  assert.equal(level.remove(firstNode), first);
  assert.equal(level.peek(), second);
  assert.equal(level.totalQuantity, 50);
});

test("fica vazio quando a última ordem é removida", () => {
  const level = new PriceLevel(1050);
  const node = level.add(buyOrder(100));

  level.remove(node);

  assert.equal(level.isEmpty, true);
  assert.equal(level.totalQuantity, 0);
});
