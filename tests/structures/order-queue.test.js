import assert from "node:assert/strict";
import test from "node:test";

import { OrderQueue } from "../../src/structures/order-queue.js";

function queueWith(...orders) {
  const queue = new OrderQueue();
  const nodes = orders.map((order) => queue.enqueue(order));

  return { queue, nodes };
}

test("representa uma fila vazia", () => {
  const queue = new OrderQueue();

  assert.equal(queue.size, 0);
  assert.equal(queue.isEmpty, true);
  assert.equal(queue.peek(), null);
  assert.equal(queue.dequeue(), null);
  assert.deepEqual(queue.toArray(), []);
});

test("atende as ordens na ordem de chegada", () => {
  const { queue } = queueWith("a", "b", "c");

  assert.equal(queue.size, 3);
  assert.equal(queue.peek(), "a");
  assert.equal(queue.dequeue(), "a");
  assert.equal(queue.dequeue(), "b");
  assert.equal(queue.dequeue(), "c");
  assert.equal(queue.dequeue(), null);
  assert.equal(queue.isEmpty, true);
});

test("consultar o início não remove a ordem", () => {
  const { queue } = queueWith("a", "b");

  assert.equal(queue.peek(), "a");
  assert.equal(queue.peek(), "a");
  assert.equal(queue.size, 2);
});

test("remove uma ordem do início da fila", () => {
  const { queue, nodes } = queueWith("a", "b", "c");

  assert.equal(queue.remove(nodes[0]), "a");
  assert.deepEqual(queue.toArray(), ["b", "c"]);
  assert.equal(queue.peek(), "b");
});

test("remove uma ordem do meio da fila preservando a ordem das demais", () => {
  const { queue, nodes } = queueWith("a", "b", "c");

  assert.equal(queue.remove(nodes[1]), "b");
  assert.deepEqual(queue.toArray(), ["a", "c"]);
  assert.equal(queue.size, 2);
});

test("remove uma ordem do fim e continua aceitando novas ordens", () => {
  const { queue, nodes } = queueWith("a", "b", "c");

  assert.equal(queue.remove(nodes[2]), "c");
  queue.enqueue("d");

  assert.deepEqual(queue.toArray(), ["a", "b", "d"]);
});

test("remove a única ordem e volta a funcionar como fila vazia", () => {
  const { queue, nodes } = queueWith("a");

  queue.remove(nodes[0]);

  assert.equal(queue.isEmpty, true);
  assert.equal(queue.peek(), null);

  queue.enqueue("b");

  assert.deepEqual(queue.toArray(), ["b"]);
  assert.equal(queue.dequeue(), "b");
});

test("rejeita remover o mesmo nó duas vezes", () => {
  const { queue, nodes } = queueWith("a", "b");

  queue.remove(nodes[0]);

  assert.throws(() => queue.remove(nodes[0]), /does not belong/);
  assert.equal(queue.size, 1);
});

test("rejeita remover nó de outra fila ou valor inválido", () => {
  const { queue } = queueWith("a");
  const { nodes: foreignNodes } = queueWith("x");

  assert.throws(() => queue.remove(foreignNodes[0]), /does not belong/);
  assert.throws(() => queue.remove(null), /does not belong/);
  assert.throws(() => queue.remove(undefined), /does not belong/);
  assert.equal(queue.size, 1);
});
