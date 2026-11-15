import assert from "node:assert/strict";
import test from "node:test";

import { OrderBook } from "../../src/order-book/order-book.js";
import { PriceLevel } from "../../src/models/price-level.js";

function assertConsistent(book) {
  const ids = new Set();
  for (const [side, tree, levels] of [
    ["buy", book.bids, book.listBids()],
    ["sell", book.asks, book.listAsks()],
  ]) {
    assert.equal(tree.size, levels.length);
    for (const view of levels) {
      const level = tree.get(view.price);
      assert.ok(level instanceof PriceLevel);
      assert.equal(level.side, side);
      assert.equal(level.isEmpty, false);
      assert.equal(level.orderCount, view.orderCount);
      assert.equal(level.totalQuantity, view.totalQuantity);
      assert.deepEqual(level.orders().map(({ id }) => id), view.orders.map(({ id }) => id));
      assert.equal(view.totalQuantity,
        view.orders.reduce((total, order) => total + order.remaining, 0));
      for (const order of view.orders) {
        assert.equal(order.side, side);
        assert.equal(order.price, view.price);
        assert.ok(!ids.has(order.id));
        ids.add(order.id);
        assert.deepEqual(book.getOrder(order.id), order);
      }
    }
  }
}

test("cria um livro vazio com duas AVLs independentes", () => {
  const book = new OrderBook();
  assert.notEqual(book.bids, book.asks);
  assert.equal(book.bids.size, 0);
  assert.equal(book.asks.size, 0);
  assert.equal(book.bestBid(), null);
  assert.equal(book.bestAsk(), null);
  assert.equal(book.getOrder(1), null);
  assert.deepEqual(book.listBids(), []);
  assert.deepEqual(book.listAsks(), []);
  assertConsistent(book);
});

test("cadastra compra e venda de preços cruzados sem negociar", () => {
  const book = new OrderBook();
  const buy = book.addOrder("buy", 10_500, 3);
  const sell = book.addOrder("sell", 10_000, 2);
  assert.deepEqual(buy, { id: 1, side: "buy", price: 10_500,
    quantity: 3, remaining: 3, sequence: 1 });
  assert.deepEqual(sell, { id: 2, side: "sell", price: 10_000,
    quantity: 2, remaining: 2, sequence: 2 });
  assertConsistent(book);
});

test("gera IDs únicos e sequências de chegada entre os dois lados", () => {
  const book = new OrderBook();
  const orders = [book.addOrder("sell", 120, 1),
    book.addOrder("buy", 100, 1), book.addOrder("sell", 120, 1)];
  assert.deepEqual(orders.map(({ id }) => id), [1, 2, 3]);
  assert.deepEqual(orders.map(({ sequence }) => sequence), [1, 2, 3]);
  assertConsistent(book);
});

test("mantém FIFO e agrega quantidades em um mesmo preço", () => {
  const book = new OrderBook();
  const first = book.addOrder("buy", 100, 4);
  const second = book.addOrder("buy", 100, 6);
  const level = book.bestBid();
  assert.equal(book.bids.size, 1);
  assert.equal(level.totalQuantity, 10);
  assert.equal(level.orderCount, 2);
  assert.deepEqual(level.orders.map(({ id }) => id), [first.id, second.id]);
  assertConsistent(book);
});

test("cria níveis distintos, encontra os melhores e lista em ordem", () => {
  const book = new OrderBook();
  for (const price of [100, 120, 110]) book.addOrder("buy", price, 2);
  for (const price of [145, 130, 140]) book.addOrder("sell", price, 3);
  assert.equal(book.bestBid().price, 120);
  assert.equal(book.bestAsk().price, 130);
  assert.equal(book.bids.size, 3);
  assert.equal(book.asks.size, 3);
  assert.deepEqual(book.listBids().map(({ price }) => price), [120, 110, 100]);
  assert.deepEqual(book.listAsks().map(({ price }) => price), [130, 140, 145]);
  assertConsistent(book);
});

test("consultas retornam cópias das ordens e níveis", () => {
  const book = new OrderBook();
  const order = book.addOrder("buy", 100, 5);
  const level = book.bestBid();
  order.quantity = 99;
  level.orders[0].remaining = 0;
  level.orders.pop();
  book.listBids()[0].orders[0].price = 999;
  assert.equal(book.getOrder(1).quantity, 5);
  assert.equal(book.getOrder(1).remaining, 5);
  assert.equal(book.bestBid().orderCount, 1);
  assert.equal(book.bestBid().totalQuantity, 5);
  assertConsistent(book);
});

test("cancela ordem existente, preservando outras do mesmo nível", () => {
  const book = new OrderBook();
  const first = book.addOrder("buy", 100, 2);
  const second = book.addOrder("buy", 100, 4);
  assert.equal(book.cancelOrder(first.id), true);
  assert.equal(book.getOrder(first.id), null);
  assert.equal(book.bestBid().totalQuantity, 4);
  assert.deepEqual(book.bestBid().orders.map(({ id }) => id), [second.id]);
  assertConsistent(book);
});

test("retorna false ao cancelar ID inexistente ou já cancelado", () => {
  const book = new OrderBook();
  const order = book.addOrder("sell", 100, 1);
  assert.equal(book.cancelOrder(999), false);
  assert.equal(book.cancelOrder(order.id), true);
  assert.equal(book.cancelOrder(order.id), false);
  assertConsistent(book);
});

test("cancela ordem intermediária sem mudar a prioridade restante", () => {
  const book = new OrderBook();
  const first = book.addOrder("sell", 100, 1);
  const middle = book.addOrder("sell", 100, 2);
  const last = book.addOrder("sell", 100, 3);
  assert.equal(book.cancelOrder(middle.id), true);
  assert.deepEqual(book.bestAsk().orders.map(({ id }) => id), [first.id, last.id]);
  assert.equal(book.bestAsk().totalQuantity, 4);
  assertConsistent(book);
});

test("remove nível quando sua última ordem é cancelada", () => {
  const book = new OrderBook();
  const order = book.addOrder("buy", 100, 1);
  assert.equal(book.cancelOrder(order.id), true);
  assert.equal(book.bids.get(100), undefined);
  assert.equal(book.bids.size, 0);
  assert.equal(book.bestBid(), null);
  assertConsistent(book);
});

test("preserva outros níveis e lados após cancelamentos", () => {
  const book = new OrderBook();
  const low = book.addOrder("buy", 90, 1);
  const high = book.addOrder("buy", 110, 2);
  const ask = book.addOrder("sell", 120, 3);
  assert.equal(book.cancelOrder(high.id), true);
  assert.deepEqual(book.listBids().map(({ price }) => price), [90]);
  assert.equal(book.bestBid().orders[0].id, low.id);
  assert.equal(book.bestAsk().orders[0].id, ask.id);
  assertConsistent(book);
});

test("reutiliza um preço após remover nível sem repetir IDs", () => {
  const book = new OrderBook();
  const first = book.addOrder("buy", 100, 1);
  book.cancelOrder(first.id);
  const second = book.addOrder("buy", 100, 2);
  assert.equal(second.id, 2);
  assert.equal(second.sequence, 2);
  assert.equal(book.bestBid().totalQuantity, 2);
  assertConsistent(book);
});

test("rejeita dados inválidos sem alterações parciais ou lacunas nos IDs", () => {
  const book = new OrderBook();
  const first = book.addOrder("buy", 100, 1);
  const before = { bids: book.listBids(), asks: book.listAsks() };
  for (const args of [
    ["other", 100, 1], [null, 100, 1],
    ["buy", 0, 1], ["buy", 1.5, 1], ["buy", Number.MAX_SAFE_INTEGER + 1, 1],
    ["sell", 100, 0], ["sell", 100, -1], ["sell", 100, 1.5],
  ]) {
    assert.throws(() => book.addOrder(...args));
    assert.deepEqual(book.listBids(), before.bids);
    assert.deepEqual(book.listAsks(), before.asks);
    assert.deepEqual(book.getOrder(first.id), first);
    assertConsistent(book);
  }
  const next = book.addOrder("sell", 120, 2);
  assert.equal(next.id, 2);
  assert.equal(next.sequence, 2);
  assertConsistent(book);
});
